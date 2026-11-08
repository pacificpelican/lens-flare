import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthService } from '../services/auth.service';
import { IDatabase } from '../db/database';
import { RegisterRequest, LoginRequest, AuthResponse, UserProfile } from '@shared/types';

export class AuthController {
  constructor(
    private db: IDatabase,
    private authService: AuthService
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, username } = req.body as RegisterRequest;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
      }

      // Check if user already exists
      const existing = await this.db.query<{ id: string }>(
        `SELECT id FROM users WHERE email = ?`,
        [email]
      );

      if (existing.length > 0) {
        res.status(400).json({ success: false, error: 'User with this email already exists' });
        return;
      }

      const userId = crypto.randomUUID();
      const passwordHash = await this.authService.hashPassword(password);
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO users (id, email, username, password_hash, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, email, username || null, passwordHash, now, now]
      );

      const { access_token, refresh_token } = await this.authService.generateTokenPair(userId, email);

      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const userProfile: UserProfile = {
        id: userId,
        email,
        username: username || null,
        created_at: now,
      };

      const response: AuthResponse = {
        user: userProfile,
        access_token,
      };

      res.status(201).json({ success: true, data: response });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
      }

      const users = await this.db.query<{
        id: string;
        email: string;
        username: string | null;
        password_hash: string;
        created_at: string;
      }>(
        `SELECT id, email, username, password_hash, created_at FROM users WHERE email = ?`,
        [email]
      );

      if (users.length === 0) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const user = users[0];
      const isPasswordValid = await this.authService.verifyPassword(password, user.password_hash);

      if (!isPasswordValid) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const { access_token, refresh_token } = await this.authService.generateTokenPair(user.id, email);

      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at,
      };

      const response: AuthResponse = {
        user: userProfile,
        access_token,
      };

      res.status(200).json({ success: true, data: response });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (refreshToken && req.user) {
        await this.authService.revokeUserRefreshTokens(req.user.user_id);
      }

      res.clearCookie('refresh_token');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, error: 'Logout failed' });
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const users = await this.db.query<{
        id: string;
        email: string;
        username: string | null;
        created_at: string;
      }>(
        `SELECT id, email, username, created_at FROM users WHERE id = ?`,
        [req.user.user_id]
      );

      if (users.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const user = users[0];
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at,
      };

      res.status(200).json({ success: true, data: userProfile });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
        res.status(401).json({ success: false, error: 'Refresh token not found' });
        return;
      }

      // Try to get user from JWT claim if available
      const authHeader = req.headers.authorization;
      let userId: string | null = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const payload = await this.authService.verifyAccessToken(token);
          if (payload) {
            userId = payload.user_id;
          }
        } catch {
          // Token is expired, that's ok
        }
      }

      // Fallback: extract user_id from the refresh token if available
      // For now, we'll require the access token to be present
      if (!userId) {
        res.status(401).json({ success: false, error: 'Cannot determine user from token' });
        return;
      }

      const newAccessToken = await this.authService.refreshAccessToken(refreshToken, userId);

      if (!newAccessToken) {
        res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
        return;
      }

      res.status(200).json({ success: true, data: { access_token: newAccessToken } });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ success: false, error: 'Token refresh failed' });
    }
  }
}
