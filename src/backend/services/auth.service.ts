import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IDatabase } from '../db/database.js';
import { JwtPayload, AuthTokens } from '@shared/types';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export class AuthService {
  constructor(
    private db: IDatabase,
    private jwtSecret: string,
    private refreshTokenSecret: string
  ) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(userId: string, email: string): string {
    return jwt.sign({ user_id: userId, email }, this.jwtSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString();
    const id = crypto.randomUUID();

    await this.db.run(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, token, expiresAt, new Date().toISOString()]
    );

    return token;
  }

  async verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return payload;
    } catch {
      return null;
    }
  }

  async verifyRefreshToken(token: string, userId: string): Promise<boolean> {
    const results = await this.db.query<{ expires_at: string }>(
      `SELECT expires_at FROM refresh_tokens 
       WHERE token = ? AND user_id = ? AND expires_at > ?`,
      [token, userId, new Date().toISOString()]
    );

    return results.length > 0;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.db.run(`DELETE FROM refresh_tokens WHERE token = ?`, [token]);
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    await this.db.run(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);
  }

  async generateTokenPair(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = await this.generateRefreshToken(userId);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refreshAccessToken(refreshToken: string, userId: string): Promise<string | null> {
    const isValid = await this.verifyRefreshToken(refreshToken, userId);
    if (!isValid) {
      return null;
    }

    // Get user email from DB
    const users = await this.db.query<{ email: string }>(
      `SELECT email FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return null;
    }

    return this.generateAccessToken(userId, users[0].email);
  }
}
