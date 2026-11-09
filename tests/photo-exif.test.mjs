import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { SqliteDatabase } from '../dist/backend/db/database.js';
import { initializeSchema } from '../dist/backend/db/schema.js';
import { PhotoService } from '../dist/backend/services/photo.service.js';
import { ExifService } from '../dist/backend/services/exif.service.js';
import { PhotoController } from '../dist/backend/controllers/photo.controller.js';

test('capture time uses the original EXIF date without guessing a timezone', async () => {
  const service = new ExifService();
  const exif = await service.extractExif(path.resolve('node_modules/exif-parser/test/starfish.jpg'));
  assert.equal(exif.dateTime, '2013:05:10 15:21:35');
  assert.equal(exif.dateDigitized, '2013:05:10 15:21:35');
  const formatted = service.formatExifForDisplay(exif);
  assert.equal(formatted['Date Taken'], '2013-05-10 15:21:35 (camera time; timezone not shown)');
  assert.equal(formatted['Camera Make'], 'Nokia');
  assert.equal(formatted['Camera Model'], 'Lumia 820');
  const otherDates = service.formatExifForDisplay({ dateDigitized: '2021:02:03 04:05:06', dateModified: '2022:03:04 05:06:07' });
  assert.equal(otherDates['Date Taken'], undefined);
  assert.match(otherDates['Date Digitized'], /^2021-02-03 04:05:06/);
  assert.match(otherDates['Date Modified'], /^2022-03-04 05:06:07/);
  assert.equal(service.formatExifForDisplay({ dateTime: '2021-02-03T04:05:06+02:00' })['Date Taken'], '2021-02-03T04:05:06+02:00');
});

test('photo responses normalize stored EXIF and recover dates for existing files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'lens-flare-exif-test-'));
  const db = new SqliteDatabase(':memory:');
  await db.init();
  try {
    await initializeSchema(db);
    await db.run('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', ['user', 'test@example.com', 'hash', '2026', '2026']);
    await copyFile(path.resolve('node_modules/exif-parser/test/starfish.jpg'), path.join(directory, 'old-photo.jpg'));
    const photos = new PhotoService(db);
    const photo = await photos.createPhoto({ userId: 'user', filename: 'old-photo.jpg', originalFilename: 'old-photo.jpg', title: 'Old photo', mimeType: 'image/jpeg', fileSize: 1, exifData: { 'Camera Make': 'Nokia', 'Date Taken': '1368199295' } });
    assert.deepEqual(photo.exif_data, { 'Camera Make': 'Nokia', 'Date Taken': '1368199295' });
    const listed = await photos.listPhotos('user');
    assert.deepEqual(listed.photos[0].exif_data, photo.exif_data);

    const controller = new PhotoController(photos, new ExifService(), {}, directory);
    const result = { statusCode: 0, body: undefined, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await controller.getDetail({ user: { user_id: 'user' }, params: { id: photo.id } }, result);
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.data.exif_data['Date Taken'], '2013-05-10 15:21:35 (camera time; timezone not shown)');
    assert.equal(result.body.data.exif_data['Camera Model'], 'Lumia 820');

    await db.run('UPDATE photos SET exif_data = ? WHERE id = ?', ['not json', photo.id]);
    assert.equal((await photos.getPhoto(photo.id, 'user')).exif_data, null);
    await db.run('UPDATE photos SET exif_data = ? WHERE id = ?', ['["not metadata"]', photo.id]);
    assert.equal((await photos.getPhoto(photo.id, 'user')).exif_data, null);
    await db.run('UPDATE photos SET exif_data = ? WHERE id = ?', [null, photo.id]);
    assert.equal((await photos.getPhoto(photo.id, 'user')).exif_data, null);
  } finally {
    await db.close();
    await rm(directory, { recursive: true, force: true });
  }
});