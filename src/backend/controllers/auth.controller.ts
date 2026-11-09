import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { AuthService } from '../services/auth.service.js';
import { IDatabase } from '../db/database.js';
import { RegisterRequest, LoginRequest, AuthResponse, UserProfile } from '@shared/types';
import { getConfig } from '../config.js';

export class AuthController {
  constructor(
    private db: IDatabase,
    private authService: AuthService,
    private uploadDir: string
  ) {}

  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { password } = req.body;
      if (typeof password !== 'string' || !password) {
        res.status(400).json({ success: false, error: 'Password is required' });
        return;
      }

      const userId = req.user.user_id;
      const users = await this.db.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?', [userId]
      );
      if (!users.length || !(await this.authService.verifyPassword(password, users[0].password_hash))) {
        res.status(400).json({ success: false, error: 'Incorrect password' });
        return;
      }

      const photos = await this.db.query<{ filename: string }>(
        'SELECT filename FROM photos WHERE user_id = ?', [userId]
      );
      for (const photo of photos) {
        if (path.basename(photo.filename) !== photo.filename || photo.filename === '.' || photo.filename === '..') {
          throw new Error('Invalid stored photo filename');
        }
        try {
          await fs.unlink(path.join(this.uploadDir, photo.filename));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }

      await this.db.run('DELETE FROM tags WHERE user_id = ?', [userId]);
      await this.db.run('DELETE FROM photos WHERE user_id = ?', [userId]);
      await this.db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
      await this.db.run('DELETE FROM users WHERE id = ?', [userId]);
      res.clearCookie('refresh_token');
      res.status(200).json({ success: true, message: 'Account deleted' });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ success: false, error: 'Account deletion did not finish. Some photos may already be deleted; please try again.' });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, username, inviteCode } = req.body as RegisterRequest & { inviteCode?: string };
      const config = getConfig();

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
      }

      // Check if signups are allowed
      if (!config.registration.allowOpenSignups) {
        // Signups closed - check invite code
        if (!inviteCode || !config.registration.inviteCodes.includes(inviteCode.trim())) {
          res.status(403).json({ success: false, error: 'Signups are currently closed. An invite code is required.' });
          return;
        }
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

  async getRegistrationConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = getConfig();
      res.status(200).json({
        success: true,
        data: {
          allowOpenSignups: config.registration.allowOpenSignups,
          requiresInviteCode: !config.registration.allowOpenSignups && config.registration.inviteCodes.length > 0,
        },
      });
    } catch (error) {
      console.error('Get registration config error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch registration config' });
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
