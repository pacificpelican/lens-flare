import { IDatabase } from '../db/database.js';
import { Photo, PhotoDetail, Tag } from '@shared/types';
import crypto from 'crypto';

type StoredPhoto = Omit<Photo, 'exif_data'> & { exif_data: Photo['exif_data'] | string };

function normalizePhoto(photo: StoredPhoto): Photo {
  let exif: unknown = photo.exif_data;
  if (typeof exif === 'string') {
    try {
      exif = JSON.parse(exif);
    } catch {
      exif = null;
    }
  }
  return {
    ...photo,
    exif_data: exif && typeof exif === 'object' && !Array.isArray(exif)
      ? exif as Record<string, unknown>
      : null,
  };
}

export class PhotoService {
  constructor(private db: IDatabase) {}

  async getOwnerName(userId: string): Promise<string> {
    const users = await this.db.query<{ username: string | null; email: string }>(
      'SELECT username, email FROM users WHERE id = ?', [userId]
    );
    if (!users.length) throw new Error('User not found');
    return users[0].username?.trim() || users[0].email;
  }

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
    const photos = await this.db.query<StoredPhoto>(
      `SELECT id, user_id, filename, original_filename, title, user_description, ai_description, 
              exif_data, file_size, mime_type, upload_date, created_at, updated_at
       FROM photos WHERE id = ? AND user_id = ?`,
      [photoId, userId]
    );

    if (photos.length === 0) {
      throw new Error('Photo not found');
    }

    return normalizePhoto(photos[0]);
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
    sortOrder: 'asc' | 'desc' = 'desc',
    filters?: {
      search?: string;
      tags?: string[];
      startDate?: string;
      endDate?: string;
      cameraModel?: string;
      iso?: number;
    }
  ): Promise<{ photos: Photo[]; total: number; totalPages: number }> {
    let whereConditions = ['p.user_id = ?'];
    const params: unknown[] = [userId];

    // Search in title, descriptions
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push(
        `(p.title LIKE ? OR p.ai_description LIKE ? OR p.user_description LIKE ?)`
      );
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Date range filter
    if (filters?.startDate) {
      whereConditions.push('p.upload_date >= ?');
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      whereConditions.push('p.upload_date <= ?');
      params.push(filters.endDate);
    }

    // Camera model filter (from EXIF data)
    if (filters?.cameraModel) {
      whereConditions.push(
        `(COALESCE(json_extract(p.exif_data, '$.make'), json_extract(p.exif_data, '$."Camera Make"')) LIKE ? OR COALESCE(json_extract(p.exif_data, '$.model'), json_extract(p.exif_data, '$."Camera Model"')) LIKE ?)`
      );
      const cameraTerm = `%${filters.cameraModel}%`;
      params.push(cameraTerm, cameraTerm);
    }

    // ISO filter (from EXIF data)
    if (filters?.iso) {
      whereConditions.push(`CAST(COALESCE(json_extract(p.exif_data, '$.iso'), json_extract(p.exif_data, '$.ISO')) AS SIGNED) = ?`);
      params.push(filters.iso);
    }

    // Build base query
    let query = `SELECT id, user_id, filename, original_filename, title, user_description, ai_description,
              exif_data, file_size, mime_type, upload_date, created_at, updated_at
      FROM photos p WHERE ${whereConditions.join(' AND ')}`;

    // Add tag filter if specified
    if (filters?.tags && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map(() => '?').join(',');
      query = `
        SELECT DISTINCT p.id, p.user_id, p.filename, p.original_filename, p.title, p.user_description, 
               p.ai_description, p.exif_data, p.file_size, p.mime_type, p.upload_date, p.created_at, p.updated_at
        FROM photos p
        INNER JOIN tags t ON p.id = t.photo_id
        WHERE ${whereConditions.join(' AND ')} AND t.tag_name IN (${tagPlaceholders})
      `;
      params.push(...filters.tags);
    }

    // Get total count
    const countConditions = whereConditions.join(' AND ');
    let countQuery = `SELECT COUNT(*) as count FROM photos p WHERE ${countConditions}`;
    const countParams = params.slice(); // Copy params for count query

    if (filters?.tags && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map(() => '?').join(',');
      countQuery = `
        SELECT COUNT(DISTINCT p.id) as count
        FROM photos p
        INNER JOIN tags t ON p.id = t.photo_id
        WHERE ${countConditions} AND t.tag_name IN (${tagPlaceholders})
      `;
    }

    const countResult = await this.db.query<{ count: number }>(
      countQuery,
      countParams
    );
    const total = countResult[0].count;

    // Get paginated results
    const offset = (page - 1) * perPage;
    query += ` ORDER BY p.upload_date ${sortOrder.toUpperCase()}, p.id ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const photos = await this.db.query<StoredPhoto>(query, params);

    return {
      photos: photos.map(normalizePhoto),
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

  async updatePhotoFile(
    photoId: string,
    userId: string,
    data: {
      filename: string;
      mimeType: string;
      fileSize: number;
      exifData?: Record<string, unknown>;
      aiDescription?: string;
    }
  ): Promise<Photo> {
    const photo = await this.getPhoto(photoId, userId);

    const updates: string[] = [];
    const params: unknown[] = [];

    updates.push('filename = ?');
    params.push(data.filename);

    updates.push('mime_type = ?');
    params.push(data.mimeType);

    updates.push('file_size = ?');
    params.push(data.fileSize);

    if (data.exifData !== undefined) {
      updates.push('exif_data = ?');
      params.push(data.exifData ? JSON.stringify(data.exifData) : null);
    }

    if (data.aiDescription !== undefined) {
      updates.push('ai_description = ?');
      params.push(data.aiDescription);
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

  async getFilterOptions(userId: string): Promise<{
    cameras: Array<{ make?: string; model?: string }>;
    isoValues: number[];
    tags: string[];
    dateRange: { earliest: string; latest: string } | null;
  }> {
    // Get unique camera makes/models from EXIF data
    const cameras = await this.db.query<{ make?: string; model?: string }>(
            `SELECT DISTINCT COALESCE(json_extract(exif_data, '$.make'), json_extract(exif_data, '$."Camera Make"')) as make,
              COALESCE(json_extract(exif_data, '$.model'), json_extract(exif_data, '$."Camera Model"')) as model
       FROM photos WHERE user_id = ? AND exif_data IS NOT NULL
       ORDER BY make, model`,
      [userId]
    );

    // Get unique ISO values
    const isos = await this.db.query<{ iso: number }>(
      `SELECT DISTINCT CAST(COALESCE(json_extract(exif_data, '$.iso'), json_extract(exif_data, '$.ISO')) AS SIGNED) as iso
       FROM photos WHERE user_id = ? AND exif_data IS NOT NULL
       ORDER BY iso`,
      [userId]
    );

    // Get unique tags
    const tags = await this.db.query<{ tag_name: string }>(
      `SELECT DISTINCT tag_name FROM tags WHERE user_id = ? ORDER BY tag_name`,
      [userId]
    );

    // Get date range
    const dateRange = await this.db.query<{ earliest: string; latest: string }>(
      `SELECT MIN(upload_date) as earliest, MAX(upload_date) as latest FROM photos WHERE user_id = ?`,
      [userId]
    );

    return {
      cameras: cameras.filter((c) => c.make || c.model),
      isoValues: isos.map((i) => i.iso).filter((iso) => iso !== null),
      tags: tags.map((t) => t.tag_name),
      dateRange:
        dateRange[0].earliest && dateRange[0].latest
          ? dateRange[0]
          : null,
    };
  }
}
