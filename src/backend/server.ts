import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getConfig } from './config';
import { createDatabase } from './db/database';
import { initializeSchema } from './db/schema';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { createAuthRoutes } from './routes/auth.routes';
import { createAuthMiddleware } from './middleware/auth';

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

  // Create controllers
  const authController = new AuthController(db, authService);

  // Create middleware
  const authMiddleware = createAuthMiddleware(authService);

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

  // Routes
  app.use('/api/auth', createAuthRoutes(authController, authMiddleware));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
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
