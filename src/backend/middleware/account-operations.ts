import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AccountOperations {
  private pending = new Map<string, Promise<void>>();

  constructor(private authService: AuthService) {}

  async run(req: Request, res: Response, next: NextFunction, operation: () => Promise<void>): Promise<void> {
    const userId = req.user!.user_id;
    const previous = this.pending.get(userId) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.pending.set(userId, current);

    await previous;
    try {
      if (res.destroyed) return;
      const token = req.headers.authorization?.slice(7) || '';
      if (!(await this.authService.verifyAccessToken(token))) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
        return;
      }
      await operation();
    } catch (error) {
      next(error);
    } finally {
      release();
      if (this.pending.get(userId) === current) this.pending.delete(userId);
    }
  }
}