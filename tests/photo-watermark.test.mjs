import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { PhotoController } from '../dist/backend/controllers/photo.controller.js';

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    send(value) { this.body = value; return this; },
  };
}

test('exports optional watermarks in all formats without changing the source', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lens-flare-watermark-'));
  try {
    const source = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#8b8b8b' } }).png().toBuffer();
    const filename = path.join(directory, 'source.png');
    await writeFile(filename, source);
    const controller = new PhotoController(
      { getPhoto: async () => ({ filename: 'source.png', title: 'Test' }) },
      {}, {}, directory
    );
    const exportPhoto = async (body) => {
      const res = response();
      await controller.export({ user: { user_id: 'owner' }, params: { id: 'photo' }, body }, res);
      return res;
    };

    const plain = await exportPhoto({ format: 'png' });
    const empty = await exportPhoto({ format: 'png', watermarkText: '   ' });
    assert.equal(plain.statusCode, 200);
    assert.deepEqual(empty.body, plain.body);
    const marked = await exportPhoto({ format: 'png', watermarkText: 'A & B <Photo>' });
    assert.equal(marked.statusCode, 200);
    assert.match(marked.headers['content-disposition'], /^attachment;/);
    const before = await sharp(plain.body).removeAlpha().raw().toBuffer();
    const after = await sharp(marked.body).removeAlpha().raw().toBuffer();
    let changed = 0;
    for (let y = 0; y < 300; y++) {
      for (let x = 0; x < 400; x++) {
        const index = (y * 400 + x) * 3;
        if (!before.subarray(index, index + 3).equals(after.subarray(index, index + 3))) {
          changed++;
          assert.ok(x >= 70 && y >= 260, `Unexpected changed pixel at ${x}, ${y}`);
        }
      }
    }
    assert.ok(changed > 100, 'watermark must visibly alter the image');
    assert.deepEqual(await readFile(filename), source);

    for (const format of ['jpeg', 'webp', 'avif', 'tiff']) {
      const result = await exportPhoto({ format, watermarkText: 'Watermark' });
      assert.equal(result.statusCode, 200, format);
      const metadata = await sharp(result.body).metadata();
      assert.equal(metadata.width, 400, format);
      assert.equal(metadata.height, 300, format);
      assert.equal(metadata.format, format === 'jpeg' ? 'jpeg' : format === 'avif' ? 'heif' : format);
      assert.match(result.headers['content-type'], new RegExp(`image/${format}`));
    }

    for (const watermarkText of [123, null, 'x'.repeat(201), 'bad\ntext']) {
      const result = await exportPhoto({ format: 'png', watermarkText });
      assert.equal(result.statusCode, 400);
      assert.equal(result.body.error, 'Invalid watermark text');
    }
    assert.equal((await exportPhoto({ format: 'png', watermarkText: 'x'.repeat(200) })).statusCode, 200);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('watermark follows image orientation and fits small images', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lens-flare-watermark-size-'));
  try {
    const controller = new PhotoController(
      { getPhoto: async () => ({ filename: 'source.jpg', title: 'Test' }) },
      {}, {}, directory
    );
    const exportPhoto = async () => {
      const res = response();
      await controller.export({ user: { user_id: 'owner' }, params: { id: 'photo' }, body: { format: 'png', watermarkText: 'Test' } }, res);
      assert.equal(res.statusCode, 200);
      return res.body;
    };
    const oriented = await sharp({ create: { width: 300, height: 200, channels: 3, background: 'white' } })
      .jpeg().withMetadata({ orientation: 6 }).toBuffer();
    await writeFile(path.join(directory, 'source.jpg'), oriented);
    const output = await exportPhoto();
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.width, 200);
    assert.equal(metadata.height, 300);
    const baseline = await sharp(oriented).rotate().removeAlpha().raw().toBuffer();
    const result = await sharp(output).removeAlpha().raw().toBuffer();
    let changed = 0;
    for (let y = 0; y < 300; y++) {
      for (let x = 0; x < 200; x++) {
        const index = (y * 200 + x) * 3;
        if (!baseline.subarray(index, index + 3).equals(result.subarray(index, index + 3))) {
          changed++;
          assert.ok(x >= 35 && y >= 260, `Unexpected oriented-image change at ${x}, ${y}`);
        }
      }
    }
    assert.ok(changed > 0);
    const tiny = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'white' } }).jpeg().toBuffer();
    await writeFile(path.join(directory, 'source.jpg'), tiny);
    assert.equal((await sharp(await exportPhoto()).metadata()).width, 10);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
