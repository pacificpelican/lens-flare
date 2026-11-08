import { Request, Response } from 'express';
import { PhotoService } from '../services/photo.service.js';
import { PaginatedResponse, Photo, PhotoDetail } from '@shared/types';
import fs from 'fs/promises';
import path from 'path';

export class PhotoController {
  constructor(private photoService: PhotoService, private uploadDir: string) {}

  async upload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const { title } = req.body;
      const filename = req.file.filename; // multer generates this
      const originalFilename = req.file.originalname;
      const mimeType = req.file.mimetype;
      const fileSize = req.file.size;

      const photo = await this.photoService.createPhoto({
        userId: req.user.user_id,
        filename,
        originalFilename,
        title: title || originalFilename.replace(/\.[^/.]+$/, ''),
        mimeType,
        fileSize,
      });

      res.status(201).json({ success: true, data: photo });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: 'Upload failed' });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 20;
      const sortBy = (req.query.sortBy as 'upload_date' | 'created_at') || 'upload_date';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const { photos, total, totalPages } = await this.photoService.listPhotos(
        req.user.user_id,
        page,
        perPage,
        sortBy,
        sortOrder
      );

      const response: PaginatedResponse<Photo> = {
        success: true,
        data: photos,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: totalPages,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('List photos error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch photos' });
    }
  }

  async getDetail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      const photo = await this.photoService.getPhotoDetail(id, req.user.user_id);

      res.status(200).json({ success: true, data: photo });
    } catch (error) {
      console.error('Get photo error:', error);
      res.status(404).json({ success: false, error: 'Photo not found' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { title, user_description, ai_description } = req.body;

      const photo = await this.photoService.updatePhoto(id, req.user.user_id, {
        title,
        userDescription: user_description,
        aiDescription: ai_description,
      });

      res.status(200).json({ success: true, data: photo });
    } catch (error) {
      console.error('Update photo error:', error);
      res.status(404).json({ success: false, error: 'Photo not found' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      // Get photo to get filename
      const photo = await this.photoService.getPhoto(id, req.user.user_id);

      // Delete from database
      await this.photoService.deletePhoto(id, req.user.user_id);

      // Delete file
      try {
        const filePath = path.join(this.uploadDir, photo.filename);
        await fs.unlink(filePath);
      } catch {
        // File might not exist, that's ok
      }

      res.status(200).json({ success: true, message: 'Photo deleted' });
    } catch (error) {
      console.error('Delete photo error:', error);
      res.status(404).json({ success: false, error: 'Photo not found' });
    }
  }

  async addTag(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { tag_name } = req.body;

      if (!tag_name) {
        res.status(400).json({ success: false, error: 'Tag name is required' });
        return;
      }

      const tag = await this.photoService.addTag(id, req.user.user_id, tag_name);

      res.status(201).json({ success: true, data: tag });
    } catch (error) {
      console.error('Add tag error:', error);
      res.status(400).json({ success: false, error: 'Failed to add tag' });
    }
  }

  async removeTag(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id, tagId } = req.params;

      if (!tagId) {
        res.status(400).json({ success: false, error: 'Tag ID is required' });
        return;
      }

      await this.photoService.removeTagById(id, req.user.user_id, tagId);

      res.status(200).json({ success: true, message: 'Tag removed' });
    } catch (error) {
      console.error('Remove tag error:', error);
      res.status(400).json({ success: false, error: 'Failed to remove tag' });
    }
  }

  async serveFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;

      // Security: only allow alphanumeric filenames (multer generates these)
      if (!/^[a-z0-9\-_.]+$/i.test(filename)) {
        res.status(400).json({ success: false, error: 'Invalid filename' });
        return;
      }

      const filePath = path.join(this.uploadDir, filename);

      // Prevent directory traversal
      if (!filePath.startsWith(this.uploadDir)) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error('Serve file error:', error);
      res.status(404).json({ success: false, error: 'File not found' });
    }
  }
}
