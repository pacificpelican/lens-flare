import { Request, Response } from 'express';
import { PhotoService } from '../services/photo.service.js';
import { ExifService } from '../services/exif.service.js';
import { AiDescriptionService } from '../services/ai-description.service.js';
import { PaginatedResponse, Photo, PhotoDetail } from '@shared/types';
import fs from 'fs/promises';
import path from 'path';

export class PhotoController {
  constructor(
    private photoService: PhotoService,
    private exifService: ExifService,
    private aiDescriptionService: AiDescriptionService,
    private uploadDir: string
  ) {}

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

      // Extract EXIF data
      let exifData: Record<string, unknown> | undefined;
      try {
        const filePath = path.join(this.uploadDir, filename);
        const exifRaw = await this.exifService.extractExif(filePath);
        if (exifRaw) {
          exifData = this.exifService.formatExifForDisplay(exifRaw) as Record<string, unknown>;
        }
      } catch (error) {
        // EXIF extraction failed - continue without it
        console.warn('EXIF extraction warning:', error instanceof Error ? error.message : 'unknown error');
      }

      // Generate AI description (async, don't wait)
      let aiDescription: string | undefined;
      try {
        const filePath = path.join(this.uploadDir, filename);
        const imageBuffer = await fs.readFile(filePath);
        aiDescription = (await this.aiDescriptionService.generateDescription(imageBuffer, filename)) || undefined;
      } catch (error) {
        // AI description generation failed - continue without it
        console.warn('AI description warning:', error instanceof Error ? error.message : 'unknown error');
      }

      const photo = await this.photoService.createPhoto({
        userId: req.user.user_id,
        filename,
        originalFilename,
        title: title || originalFilename.replace(/\.[^/.]+$/, ''),
        mimeType,
        fileSize,
        exifData,
        aiDescription,
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

      // Parse filter parameters
      const tagsParam = req.query.tags;
      const tagsArray = tagsParam 
        ? (Array.isArray(tagsParam) ? tagsParam.map(t => String(t)) : [String(tagsParam)])
        : undefined;

      const filters = {
        search: req.query.search as string | undefined,
        tags: tagsArray,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        cameraModel: req.query.cameraModel as string | undefined,
        iso: req.query.iso ? parseInt(req.query.iso as string) : undefined,
      };

      const { photos, total, totalPages } = await this.photoService.listPhotos(
        req.user.user_id,
        page,
        perPage,
        sortBy,
        sortOrder,
        filters
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

  async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const options = await this.photoService.getFilterOptions(req.user.user_id);

      res.status(200).json({ success: true, data: options });
    } catch (error) {
      console.error('Get filter options error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch filter options' });
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

  async replacePhoto(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      // Get the existing photo to verify ownership
      const existingPhoto = await this.photoService.getPhotoDetail(id, req.user.user_id);
      if (!existingPhoto) {
        res.status(404).json({ success: false, error: 'Photo not found' });
        return;
      }

      // Delete old file
      try {
        const oldFilePath = path.join(this.uploadDir, existingPhoto.filename);
        await fs.unlink(oldFilePath);
      } catch {
        // Old file might not exist, that's ok
      }

      // Update database with new filename
      const newFilename = req.file.filename;
      const mimeType = req.file.mimetype;
      const fileSize = req.file.size;

      // Extract EXIF data from edited image
      let exifData: Record<string, unknown> | undefined;
      try {
        const filePath = path.join(this.uploadDir, newFilename);
        const exifRaw = await this.exifService.extractExif(filePath);
        if (exifRaw) {
          exifData = this.exifService.formatExifForDisplay(exifRaw) as Record<string, unknown>;
        }
      } catch (error) {
        console.warn('EXIF extraction warning:', error instanceof Error ? error.message : 'unknown error');
      }

      // Generate new AI description for edited image
      let aiDescription: string | undefined;
      try {
        const filePath = path.join(this.uploadDir, newFilename);
        const imageBuffer = await fs.readFile(filePath);
        aiDescription = (await this.aiDescriptionService.generateDescription(imageBuffer, newFilename)) || undefined;
      } catch (error) {
        console.warn('AI description warning:', error instanceof Error ? error.message : 'unknown error');
      }

      // Update photo record
      const updatedPhoto = await this.photoService.updatePhotoFile(id, req.user.user_id, {
        filename: newFilename,
        mimeType,
        fileSize,
        exifData,
        aiDescription,
      });

      res.status(200).json({ success: true, data: updatedPhoto });
    } catch (error) {
      console.error('Replace photo error:', error);
      res.status(500).json({ success: false, error: 'Failed to replace photo' });
    }
  }

  async export(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { format = 'jpeg', quality = 80 } = req.body as {
        format?: string;
        quality?: number;
      };

      // Validate format
      const validFormats = ['jpeg', 'png', 'webp', 'avif', 'tiff'];
      if (!validFormats.includes(format)) {
        res.status(400).json({ success: false, error: 'Invalid export format' });
        return;
      }

      // Validate quality (1-100)
      const qualityValue = Math.max(1, Math.min(100, quality || 80));

      // Get photo details
      const photo = await this.photoService.getPhoto(id, req.user.user_id);
      if (!photo) {
        res.status(404).json({ success: false, error: 'Photo not found' });
        return;
      }

      // Read original file
      const filePath = path.join(this.uploadDir, photo.filename);
      const imageBuffer = await fs.readFile(filePath);

      // Import Sharp dynamically to avoid circular dependencies
      const sharp = (await import('sharp')).default;

      // Convert and export
      let exportBuffer: Buffer;
      let contentType: string;
      let fileExtension: string;

      const sharpImage = sharp(imageBuffer);

      switch (format) {
        case 'png':
          contentType = 'image/png';
          fileExtension = 'png';
          exportBuffer = await sharpImage.png().toBuffer();
          break;

        case 'webp':
          contentType = 'image/webp';
          fileExtension = 'webp';
          exportBuffer = await sharpImage.webp({ quality: qualityValue }).toBuffer();
          break;

        case 'avif':
          contentType = 'image/avif';
          fileExtension = 'avif';
          exportBuffer = await sharpImage.avif({ quality: qualityValue }).toBuffer();
          break;

        case 'tiff':
          contentType = 'image/tiff';
          fileExtension = 'tiff';
          exportBuffer = await sharpImage.tiff().toBuffer();
          break;

        case 'jpeg':
        default:
          contentType = 'image/jpeg';
          fileExtension = 'jpeg';
          exportBuffer = await sharpImage.jpeg({ quality: qualityValue, progressive: true }).toBuffer();
          break;
      }

      // Send file for download
      const filename = `${photo.title || 'photo'}-${Date.now()}.${fileExtension}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', exportBuffer.length);
      res.send(exportBuffer);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ success: false, error: 'Export failed' });
    }
  }
}
