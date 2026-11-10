import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { AccountOperations } from '../middleware/account-operations.js';

export function createAuthRoutes(authController: AuthController, authMiddleware: ReturnType<typeof createAuthMiddleware>, accountOperations: AccountOperations): Router {
  const router = Router();

  router.post('/register', (req: Request, res: Response) => authController.register(req, res));
  router.post('/login', (req: Request, res: Response) => authController.login(req, res));
  router.get('/config', (req: Request, res: Response) => authController.getRegistrationConfig(req, res));
  router.post('/refresh', (req: Request, res: Response) => authController.refresh(req, res));
  router.post('/logout', authMiddleware, (req: Request, res: Response) => authController.logout(req, res));
  router.get('/me', authMiddleware, (req: Request, res: Response) => authController.getMe(req, res));
  router.delete('/me', authMiddleware, (req, res, next) =>
    accountOperations.run(req, res, next, () => authController.deleteAccount(req, res))
  );
  router.post('/forgot-password', (req: Request, res: Response) => authController.forgotPassword(req, res));
  router.post('/validate-reset-token', (req: Request, res: Response) => authController.validateResetToken(req, res));
  router.post('/reset-password', (req: Request, res: Response) => authController.resetPassword(req, res));

  return router;
}
