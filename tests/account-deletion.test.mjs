import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sqlite3 from 'sqlite3';
import { AccountOperations } from '../dist/backend/middleware/account-operations.js';

test('account deletion removes only the authenticated user and their data', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lens-flare-account-test-'));
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
      server.stdout.on('data', () => {
        if (output.includes('Server listening')) { clearTimeout(timer); resolve(); }
      });
      server.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
    });

    const base = `http://127.0.0.1:${port}`;
    const request = async (url, options = {}) => {
      const response = await fetch(base + url, options);
      return { status: response.status, body: await response.json(), headers: response.headers };
    };
    const register = async (email) => {
      const response = await request('/api/auth/register', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'correct-password' }),
      });
      assert.equal(response.status, 201);
      return response.body.data;
    };
    const upload = async (token) => {
      const form = new FormData();
      form.append('photo', new Blob([Buffer.from('/9j/2Q==', 'base64')], { type: 'image/jpeg' }), 'photo.jpg');
      const response = await request('/api/photos/upload', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form });
      assert.equal(response.status, 201);
      return response.body.data;
    };
    const removeAccount = (token, password) => request('/api/auth/me', {
      method: 'DELETE', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const first = await register('first@example.com');
    const second = await register('second@example.com');
    const firstPhoto = await upload(first.access_token);
    const anotherFirstPhoto = await upload(first.access_token);
    const secondPhoto = await upload(second.access_token);
    const firstFile = path.join(directory, 'uploads', firstPhoto.filename);
    const anotherFirstFile = path.join(directory, 'uploads', anotherFirstPhoto.filename);
    const secondFile = path.join(directory, 'uploads', secondPhoto.filename);
    const tag = await request(`/api/photos/${firstPhoto.id}/tags`, {
      method: 'POST', headers: { authorization: `Bearer ${first.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ tag_name: 'test' }),
    });
    assert.equal(tag.status, 201);

    assert.equal((await removeAccount(first.access_token, 'wrong-password')).status, 400);
    await stat(firstFile);

    await rm(firstFile);
    await mkdir(firstFile);
    assert.equal((await removeAccount(first.access_token, 'correct-password')).status, 500);
    assert.equal((await request('/api/auth/me', { headers: { authorization: `Bearer ${first.access_token}` } })).status, 200);
    await rm(firstFile, { recursive: true });
    const retryPhoto = await upload(first.access_token);
    const retryFile = path.join(directory, 'uploads', retryPhoto.filename);
    await stat(retryFile);

    const deleted = await removeAccount(first.access_token, 'correct-password');
    assert.equal(deleted.status, 200);
    assert.match(deleted.headers.get('set-cookie'), /refresh_token=;/);
    assert.equal((await request('/api/auth/me', { headers: { authorization: `Bearer ${first.access_token}` } })).status, 401);
    assert.equal((await request('/api/auth/me', { headers: { authorization: `Bearer ${second.access_token}` } })).status, 200);
    await assert.rejects(stat(firstFile), { code: 'ENOENT' });
    await assert.rejects(stat(anotherFirstFile), { code: 'ENOENT' });
    await assert.rejects(stat(retryFile), { code: 'ENOENT' });
    assert.ok((await readFile(secondFile)).length > 0);

    const db = new sqlite3.Database(database);
    try {
      for (const table of ['photos', 'tags', 'refresh_tokens']) {
        const row = await new Promise((resolve, reject) => db.get(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`, [first.user.id], (error, result) => error ? reject(error) : resolve(result)));
        assert.equal(row.count, 0, table);
      }
      const user = await new Promise((resolve, reject) => db.get('SELECT COUNT(*) AS count FROM users WHERE id = ?', [first.user.id], (error, result) => error ? reject(error) : resolve(result)));
      assert.equal(user.count, 0);
    } finally {
      await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
    }
  } finally {
    if (server.exitCode === null) {
      server.kill('SIGINT');
      await once(server, 'exit');
    }
    await rm(directory, { recursive: true, force: true });
  }
});

test('account operations wait for earlier mutations and reject a deleted user', async () => {
  let exists = true;
  const operations = new AccountOperations({ verifyAccessToken: async () => exists ? { user_id: 'user' } : null });
  const req = { user: { user_id: 'user' }, headers: { authorization: 'Bearer token' } };
  const response = () => ({ destroyed: false, statusCode: 200, status(code) { this.statusCode = code; return this; }, json() {} });
  const firstResponse = response();
  const deletionResponse = response();
  const lastResponse = response();
  const events = [];
  let finishUpload;
  const upload = operations.run(req, firstResponse, assert.fail, async () => {
    events.push('upload started');
    await new Promise((resolve) => { finishUpload = resolve; });
    events.push('upload finished');
  });
  await new Promise((resolve) => setImmediate(resolve));
  const deletion = operations.run(req, deletionResponse, assert.fail, async () => { events.push('deleted'); exists = false; });
  const lateUpload = operations.run(req, lastResponse, assert.fail, async () => { events.push('late upload'); });
  finishUpload();
  await Promise.all([upload, deletion, lateUpload]);
  assert.deepEqual(events, ['upload started', 'upload finished', 'deleted']);
  assert.equal(lastResponse.statusCode, 401);
});