import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getConfig } from './config.js';
import { createDatabase } from './db/database.js';
import { initializeSchema } from './db/schema.js';
import { AuthService } from './services/auth.service.js';
import { PhotoService } from './services/photo.service.js';
import { ExifService } from './services/exif.service.js';
import { AiDescriptionService } from './services/ai-description.service.js';
import { AuthController } from './controllers/auth.controller.js';
import { PhotoController } from './controllers/photo.controller.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createPhotoRoutes } from './routes/photo.routes.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { AccountOperations } from './middleware/account-operations.js';
import { mkdir } from 'fs/promises';
import path from 'path';

async function bootstrap() {
  const config = getConfig();
  console.log(`🚀 Starting Lens Flare server in ${config.nodeEnv} mode`);
  console.log(`📦 Database type: ${config.database.type}`);

  // Initialize database
  const db = createDatabase(config.database);
  await db.init();
  console.log('✓ Database connected');

  // Initialize schema
  await initializeSchema(db);

  // Create services
  const authService = new AuthService(db, config.jwtSecret, config.refreshTokenSecret);
  const photoService = new PhotoService(db);
  const exifService = new ExifService();
  const aiDescriptionService = new AiDescriptionService(config.ai);

  // Log AI configuration
  if (aiDescriptionService.isEnabled()) {
    console.log(`🤖 AI enabled: ${config.ai.provider} (model: ${config.ai.model})`);
  } else {
    console.log('🤖 AI disabled');
  }

  // Create controllers
  const uploadDir = path.join(process.cwd(), 'uploads');
  await mkdir(uploadDir, { recursive: true });
  const authController = new AuthController(db, authService, uploadDir);
  const photoController = new PhotoController(photoService, exifService, aiDescriptionService, uploadDir);

  // Create middleware
  const authMiddleware = createAuthMiddleware(authService);
  const accountOperations = new AccountOperations(authService);

  // Initialize Express app
  const app: Express = express();

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Serve uploaded files as static
  app.use('/uploads', express.static(uploadDir));

  // Routes
  app.use('/api/auth', createAuthRoutes(authController, authMiddleware, accountOperations));
  app.use('/api/photos', createPhotoRoutes(photoController, authMiddleware, accountOperations));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
  });

  // System info endpoint (debug)
  app.get('/api/system-info', (req, res) => {
    res.json({
      success: true,
      data: {
        database: {
          type: config.database.type,
        },
        ai: {
          enabled: aiDescriptionService.isEnabled(),
          provider: config.ai.provider,
          model: config.ai.model,
        },
        php: {
          available: false,
        },
        environment: config.nodeEnv,
      },
    });
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // Start server
  app.listen(config.port, config.host, () => {
    console.log(`✓ Server listening on http://${config.host}:${config.port}`);
    console.log(`📝 API available at http://${config.host}:${config.port}/api`);
    console.log(`📸 Upload directory: ${uploadDir}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await db.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

