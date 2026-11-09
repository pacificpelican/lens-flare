import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { PhotoController } from '../controllers/photo.controller.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { AccountOperations } from '../middleware/account-operations.js';

export function createPhotoRoutes(
  photoController: PhotoController,
  authMiddleware: ReturnType<typeof createAuthMiddleware>,
  accountOperations: AccountOperations
): Router {
  const router = Router();

  // Configure multer for file upload
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Upload to common directory - separation by user happens at DB level
      const uploadDir = path.join(process.cwd(), 'uploads');
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: timestamp-random.ext
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      cb(null, filename);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB
    },
    fileFilter: (req, file, cb) => {
      // Accept common photo formats
      const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'image/gif',
        'image/heic',
        'image/heif',
        'image/x-canon-crw',
        'image/x-canon-cr2',
        'image/x-nikon-nef',
        'image/x-sony-arw',
      ];

      if (!allowed.includes(file.mimetype)) {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
      } else {
        cb(null, true);
      }
    },
  });

  // Photo routes
  router.post('/upload', authMiddleware, (req, res, next) =>
    accountOperations.run(req, res, next, async () => {
      await new Promise<void>((resolve, reject) => upload.array('photo', 50)(req, res, (error) => error ? reject(error) : resolve()));
      await photoController.upload(req, res);
    })
  );

  router.get('/', authMiddleware, (req: Request, res: Response) =>
    photoController.list(req, res)
  );

  router.get('/options/filters', authMiddleware, (req: Request, res: Response) =>
    photoController.getFilterOptions(req, res)
  );

  router.get('/:id', authMiddleware, (req: Request, res: Response) =>
    photoController.getDetail(req, res)
  );

  router.put('/:id', authMiddleware, (req, res, next) =>
    accountOperations.run(req, res, next, () => photoController.update(req, res))
  );

  router.delete('/:id', authMiddleware, (req, res, next) =>
    accountOperations.run(req, res, next, () => photoController.delete(req, res))
  );

  // Tag routes
  router.post('/:id/tags', authMiddleware, (req, res, next) =>
    accountOperations.run(req, res, next, () => photoController.addTag(req, res))
  );

  router.delete('/:id/tags/:tagId', authMiddleware, (req, res, next) =>
    accountOperations.run(req, res, next, () => photoController.removeTag(req, res))
  );

  // Replace photo file (for edited photos)
  router.post('/:id/replace', authMiddleware, (req, res, next) =>
    accountOperations.run(req, res, next, async () => {
      await new Promise<void>((resolve, reject) => upload.single('file')(req, res, (error) => error ? reject(error) : resolve()));
      await photoController.replacePhoto(req, res);
    })
  );

  // Export photo in different format
  router.post('/:id/export', authMiddleware, (req: Request, res: Response) =>
    photoController.export(req, res)
  );

  // Serve uploaded files
  router.get('/files/:filename', (req: Request, res: Response) =>
    photoController.serveFile(req, res)
  );

  return router;
}
