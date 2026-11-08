import { IDatabase } from '../db/database.js';
import { Photo, PhotoDetail, Tag } from '@shared/types';
import crypto from 'crypto';

export class PhotoService {
  constructor(private db: IDatabase) {}

  async createPhoto(data: {
    userId: string;
    filename: string;
    originalFilename: string;
    title: string;
    mimeType: string;
    fileSize: number;
    exifData?: Record<string, unknown>;
    aiDescription?: string;
  }): Promise<Photo> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const uploadDate = now;

    await this.db.run(
      `INSERT INTO photos (id, user_id, filename, original_filename, title, ai_description, exif_data, file_size, mime_type, upload_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.filename,
        data.originalFilename,
        data.title,
        data.aiDescription || null,
        data.exifData ? JSON.stringify(data.exifData) : null,
        data.fileSize,
        data.mimeType,
        uploadDate,
        now,
        now,
      ]
    );

    return this.getPhoto(id, data.userId);
  }

  async getPhoto(photoId: string, userId: string): Promise<Photo> {
    const photos = await this.db.query<Photo>(
      `SELECT id, user_id, filename, original_filename, title, user_description, ai_description, 
              exif_data, file_size, mime_type, upload_date, created_at, updated_at
       FROM photos WHERE id = ? AND user_id = ?`,
      [photoId, userId]
    );

    if (photos.length === 0) {
      throw new Error('Photo not found');
    }

    return photos[0];
  }

  async getPhotoDetail(photoId: string, userId: string): Promise<PhotoDetail> {
    const photo = await this.getPhoto(photoId, userId);

    // Get tags
    const tags = await this.db.query<{ tag_name: string }>(
      `SELECT tag_name FROM tags WHERE photo_id = ? AND user_id = ? ORDER BY tag_name ASC`,
      [photoId, userId]
    );

    return {
      ...photo,
      tags: tags.map((t) => t.tag_name),
    };
  }

  async listPhotos(
    userId: string,
    page: number = 1,
    perPage: number = 20,
    sortBy: 'upload_date' | 'created_at' = 'upload_date',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ photos: Photo[]; total: number; totalPages: number }> {
    // Get total count
    const countResult = await this.db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM photos WHERE user_id = ?`,
      [userId]
    );
    const total = countResult[0].count;

    // Get paginated results
    const offset = (page - 1) * perPage;
    const photos = await this.db.query<Photo>(
      `SELECT id, user_id, filename, original_filename, title, user_description, ai_description,
              exif_data, file_size, mime_type, upload_date, created_at, updated_at
       FROM photos WHERE user_id = ?
       ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [userId, perPage, offset]
    );

    return {
      photos,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async updatePhoto(
    photoId: string,
    userId: string,
    data: {
      title?: string;
      userDescription?: string;
      aiDescription?: string;
    }
  ): Promise<Photo> {
    const photo = await this.getPhoto(photoId, userId);

    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.userDescription !== undefined) {
      updates.push('user_description = ?');
      params.push(data.userDescription);
    }
    if (data.aiDescription !== undefined) {
      updates.push('ai_description = ?');
      params.push(data.aiDescription);
    }

    if (updates.length === 0) {
      return photo;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(photoId);
    params.push(userId);

    await this.db.run(
      `UPDATE photos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    return this.getPhoto(photoId, userId);
  }

  async deletePhoto(photoId: string, userId: string): Promise<void> {
    // Delete tags first (foreign key)
    await this.db.run(`DELETE FROM tags WHERE photo_id = ? AND user_id = ?`, [photoId, userId]);

    // Delete photo
    const result = await this.db.run(`DELETE FROM photos WHERE id = ? AND user_id = ?`, [
      photoId,
      userId,
    ]);

    if (result.changes === 0) {
      throw new Error('Photo not found');
    }
  }

  async addTag(photoId: string, userId: string, tagName: string): Promise<Tag> {
    // Verify photo belongs to user
    await this.getPhoto(photoId, userId);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await this.db.run(
        `INSERT INTO tags (id, user_id, photo_id, tag_name, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, userId, photoId, tagName, now]
      );
    } catch (error) {
      // Tag might already exist (unique constraint), that's ok
      if ((error as any).message?.includes('UNIQUE')) {
        // Tag already exists, return it
        const existing = await this.db.query<Tag>(
          `SELECT id, user_id, photo_id, tag_name, created_at FROM tags WHERE photo_id = ? AND tag_name = ?`,
          [photoId, tagName]
        );
        if (existing.length > 0) {
          return existing[0];
        }
      }
      throw error;
    }

    const tags = await this.db.query<Tag>(
      `SELECT id, user_id, photo_id, tag_name, created_at FROM tags WHERE id = ?`,
      [id]
    );

    return tags[0];
  }

  async removeTag(photoId: string, userId: string, tagName: string): Promise<void> {
    // Verify photo belongs to user
    await this.getPhoto(photoId, userId);

    await this.db.run(`DELETE FROM tags WHERE photo_id = ? AND tag_name = ?`, [
      photoId,
      tagName,
    ]);
  }

  async removeTagById(photoId: string, userId: string, tagId: string): Promise<void> {
    // Verify photo belongs to user
    await this.getPhoto(photoId, userId);

    await this.db.run(`DELETE FROM tags WHERE id = ? AND photo_id = ? AND user_id = ?`, [
      tagId,
      photoId,
      userId,
    ]);
  }
}
