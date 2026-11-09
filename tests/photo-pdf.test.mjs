import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sqlite3 from 'sqlite3';
import sharp from 'sharp';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createPhotoPdf } from '../dist/backend/services/photo-pdf.service.js';

test('photo PDF exports all filtered pages, metadata, and the closing page', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lens-flare-pdf-test-'));
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const database = path.join(directory, 'test.db');
  const server = spawn(process.execPath, [path.resolve('dist/backend/server.js')], {
    cwd: directory,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATABASE_TYPE: 'sqlite', SQLITE_PATH: database, JWT_SECRET: 'test-secret', REFRESH_TOKEN_SECRET: 'test-refresh-secret', AI_ENABLED: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', (data) => { output += data; });
  server.stderr.on('data', (data) => { output += data; });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Server startup timed out: ${output}`)), 10000);
      server.stdout.on('data', () => { if (output.includes('Server listening')) { clearTimeout(timer); resolve(); } });
      server.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
    });
    const base = `http://127.0.0.1:${port}`;
    const register = async (email, username) => {
      const response = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, username, password: 'password' }) });
      assert.equal(response.status, 201);
      return (await response.json()).data;
    };
    const first = await register('first@example.com', 'Camera Owner');
    const second = await register('second@example.com');
    const image = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#ad5b32' } }).jpeg().toBuffer();
    await writeFile(path.join(directory, 'uploads', 'test.jpg'), image);

    const db = new sqlite3.Database(database);
    const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, (error) => error ? reject(error) : resolve()));
    try {
      for (let index = 0; index < 51; index++) {
        const id = `photo-${index}`;
        await run('INSERT INTO photos (id, user_id, filename, original_filename, title, user_description, ai_description, exif_data, file_size, mime_type, upload_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, first.user.id, 'test.jpg', 'original.jpg', `Photo ${index}`, 'My notes', 'AI notes', JSON.stringify({ 'Camera Make': 'Example Camera', ISO: '400' }), image.length, 'image/jpeg', '2026-01-01', '2026-01-01', '2026-01-01']);
        await run('INSERT INTO tags (id, user_id, photo_id, tag_name, created_at) VALUES (?, ?, ?, ?, ?)', [`tag-${index}`, first.user.id, id, 'selected', '2026-01-01']);
      }
      await run('INSERT INTO photos (id, user_id, filename, original_filename, title, file_size, mime_type, upload_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['other-photo', second.user.id, 'test.jpg', 'other.jpg', 'Other user photo', image.length, 'image/jpeg', '2026-01-01', '2026-01-01', '2026-01-01']);
    } finally {
      await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
    }

    assert.equal((await fetch(`${base}/api/photos/print`)).status, 401);
    const optionsResponse = await fetch(`${base}/api/photos/options/filters`, { headers: { authorization: `Bearer ${first.access_token}` } });
    const options = await optionsResponse.json();
    assert.equal(optionsResponse.status, 200);
    assert.ok(options.data.cameras.some((camera) => camera.make === 'Example Camera'));
    assert.ok(options.data.isoValues.includes(400));
    const response = await fetch(`${base}/api/photos/print?tags=selected&cameraModel=Example&iso=400`, { headers: { authorization: `Bearer ${first.access_token}`, origin: 'http://localhost:5173' } });
    assert.equal(response.status, 200, output);
    assert.match(response.headers.get('content-type'), /application\/pdf/);
    assert.match(response.headers.get('content-disposition'), /filename="Lens_Flare_photos__.*\.pdf"/);
    assert.match(response.headers.get('access-control-expose-headers'), /Content-Disposition/i);
    const pdf = await getDocument({ data: new Uint8Array(await response.arrayBuffer()), useSystemFonts: true }).promise;
    assert.equal(pdf.numPages, 52);
    const text = async (pageNumber) => (await (await pdf.getPage(pageNumber)).getTextContent()).items.map((item) => item.str).join(' ');
    const firstPage = await text(1);
    assert.match(firstPage, /Camera Owner Photos/);
    assert.match(firstPage, /Printed 20/);
    assert.match(firstPage, /original\.jpg/);
    assert.match(firstPage, /My notes/);
    assert.match(firstPage, /AI notes/);
    assert.match(firstPage, /Example Camera/);
    assert.match(firstPage, /selected/);
    const imageOps = (await (await pdf.getPage(1)).getOperatorList()).fnArray;
    assert.ok(imageOps.includes(OPS.paintImageXObject) || imageOps.includes(OPS.paintJpegXObject));
    assert.doesNotMatch(firstPage, /Other user photo/);
    assert.match(await text(51), /Photo/);
    const lastPage = await text(52);
    assert.match(lastPage, /Lens Flare/);
    assert.match(lastPage, /photo archiver/);
    assert.match(lastPage, /https:\/\/github\.com\/pacificpelican\/lens-flare/);
    const logoOps = (await (await pdf.getPage(52)).getOperatorList()).fnArray;
    assert.ok(logoOps.includes(OPS.paintImageXObject) || logoOps.includes(OPS.paintJpegXObject));
    await pdf.cleanup();

    const longPdfData = await createPhotoPdf([{
      id: 'long', user_id: first.user.id, filename: 'test.jpg', original_filename: 'original.jpg', title: 'Long notes',
      user_description: `${'A long description with details. '.repeat(400)} END-OF-NOTES`, ai_description: null,
      exif_data: { 'Camera Make': 'Example Camera' }, file_size: image.length, mime_type: 'image/jpeg',
      upload_date: '2026-01-01', created_at: '2026-01-01', updated_at: '2026-01-01', tags: ['selected'],
    }], 'Camera Owner', new Date('2026-01-01T00:00:00Z'), path.join(directory, 'uploads'));
    const longPdf = await getDocument({ data: new Uint8Array(longPdfData), useSystemFonts: true }).promise;
    assert.ok(longPdf.numPages > 2);
    const longText = [];
    for (let page = 1; page <= longPdf.numPages; page++) longText.push((await (await longPdf.getPage(page)).getTextContent()).items.map((item) => item.str).join(' '));
    assert.match(longText.join(' '), /END-OF-NOTES/);
    assert.match(longText.at(-1), /https:\/\/github\.com\/pacificpelican\/lens-flare/);
    await longPdf.cleanup();

    const empty = await fetch(`${base}/api/photos/print?search=no-such-photo`, { headers: { authorization: `Bearer ${second.access_token}` } });
    assert.equal(empty.status, 200);
    const emptyPdf = await getDocument({ data: new Uint8Array(await empty.arrayBuffer()), useSystemFonts: true }).promise;
    assert.equal(emptyPdf.numPages, 2);
    const emptyText = (await (await emptyPdf.getPage(1)).getTextContent()).items.map((item) => item.str).join(' ');
    assert.match(emptyText, /second@example.com Photos/);
    assert.match(emptyText, /No photos match/);
    await emptyPdf.cleanup();
  } finally {
    if (server.exitCode === null) { server.kill('SIGINT'); await once(server, 'exit'); }
    await rm(directory, { recursive: true, force: true });
  }
});