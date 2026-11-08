import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { createAuthMiddleware } from '../middleware/auth';

export function createAuthRoutes(authController: AuthController, authMiddleware: ReturnType<typeof createAuthMiddleware>): Router {
  const router = Router();

  router.post('/register', (req: Request, res: Response) => authController.register(req, res));
  router.post('/login', (req: Request, res: Response) => authController.login(req, res));
  router.post('/refresh', (req: Request, res: Response) => authController.refresh(req, res));
  router.post('/logout', authMiddleware, (req: Request, res: Response) => authController.logout(req, res));
  router.get('/me', authMiddleware, (req: Request, res: Response) => authController.getMe(req, res));

  return router;
}
