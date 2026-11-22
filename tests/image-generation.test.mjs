import assert from 'node:assert/strict';
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { SqliteDatabase } from '../dist/backend/db/database.js';
import { initializeSchema } from '../dist/backend/db/schema.js';
import { PhotoService } from '../dist/backend/services/photo.service.js';
import { ExifService } from '../dist/backend/services/exif.service.js';
import { PhotoController } from '../dist/backend/controllers/photo.controller.js';
import { ImageGenerationService } from '../dist/backend/services/ai-image.service.js';

const IMAGE = Buffer.from('fake-png-bytes');

async function withOllama(handler, run) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requests.push(JSON.parse(body));
      handler(res);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`, requests);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

const config = (endpoint, overrides = {}) => ({ enabled: true, provider: 'ollama', endpoint, model: 'llava:latest', imageModel: 'flux2-klein:4b', ...overrides });

function response() {
  const res = { statusCode: 0, body: undefined, writableEnded: false, handlers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (value) => { res.body = value; res.writableEnded = true; return res; };
  res.on = (event, fn) => { res.handlers[event] = fn; return res; };
  return res;
}

test('image service streams progress from the image model and returns the final image', async () => {
  await withOllama((res) => {
    res.write(`${JSON.stringify({ completed: 1, total: 2 })}\n`);
    res.end(`${JSON.stringify({ done: true, image: IMAGE.toString('base64') })}\n`);
  }, async (endpoint, requests) => {
    const image = await new ImageGenerationService(config(endpoint)).generateImage('a cat');
    assert.deepEqual(image, IMAGE);
    assert.equal(requests[0].model, 'flux2-klein:4b');
    assert.equal(requests[0].prompt, 'a cat');
  });
});

test('image service reports a model that returns no image and is disabled for non-Ollama providers', async () => {
  await withOllama((res) => res.end(`${JSON.stringify({ done: true, response: 'text' })}\n`), async (endpoint) => {
    await assert.rejects(new ImageGenerationService(config(endpoint)).generateImage('a cat'), /did not return an image/);
  });
  assert.equal(new ImageGenerationService(config('http://x', { provider: 'openai' })).isEnabled(), false);
  assert.equal(new ImageGenerationService(config('http://x', { imageModel: undefined })).isEnabled(), false);
});

test('generate endpoint saves the image as a gallery photo and cleans up on failure', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lens-flare-imagegen-test-'));
  const db = new SqliteDatabase(':memory:');
  await db.init();
  try {
    await initializeSchema(db);
    await db.run('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', ['user', 'test@example.com', 'hash', '2026', '2026']);
    const photos = new PhotoService(db);
    const build = (endpoint) => new PhotoController(photos, new ExifService(), {}, directory, new ImageGenerationService(config(endpoint)));
    const request = (prompt) => ({ user: { user_id: 'user' }, body: { prompt } });

    await withOllama((res) => res.end(`${JSON.stringify({ done: true, image: IMAGE.toString('base64') })}\n`), async (endpoint) => {
      const controller = build(endpoint);

      const empty = response();
      await controller.generate(request('   '), empty);
      assert.equal(empty.statusCode, 400);

      const ok = response();
      await controller.generate(request('a lighthouse'), ok);
      assert.equal(ok.statusCode, 201);
      assert.equal(ok.body.data.title, 'a lighthouse');
      assert.equal(ok.body.data.mime_type, 'image/png');
      await access(path.join(directory, ok.body.data.filename));
      assert.equal((await photos.listPhotos('user')).total, 1);
    });

    await withOllama((res) => { res.statusCode = 500; res.end('boom'); }, async (endpoint) => {
      const failed = response();
      await build(endpoint).generate(request('another'), failed);
      assert.equal(failed.statusCode, 502);
      assert.equal((await photos.listPhotos('user')).total, 1);
      assert.equal((await readdir(directory)).length, 1);
    });

    const disabled = response();
    await new PhotoController(photos, new ExifService(), {}, directory).generate(request('x'), disabled);
    assert.equal(disabled.statusCode, 503);
  } finally {
    await db.close();
    await rm(directory, { recursive: true, force: true });
  }
});
