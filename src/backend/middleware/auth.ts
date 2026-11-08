import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: { user_id: string; email: string };
    }
  }
}

export function createAuthMiddleware(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.slice(7);
      const payload = await authService.verifyAccessToken(token);

      if (!payload) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
      }

      req.user = {
        user_id: payload.user_id,
        email: payload.email,
      };

      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Authentication failed' });
    }
  };
}
