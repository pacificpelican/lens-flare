import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { emailService } from './email.service.js';

const RESET_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export class PasswordResetService {
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await db.get(
        'SELECT id, username FROM users WHERE email = ?',
        [email]
      );

      if (!user) {
        // For security, don't reveal if email exists
        return { success: true, message: 'If an account exists, a reset link will be sent' };
      }

      // Create reset token
      const tokenId = uuidv4();
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MS).toISOString();

      await db.run(
        `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [tokenId, user.id, resetToken, expiresAt, new Date().toISOString()]
      );

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken, user.username);

      return { success: true, message: 'If an account exists, a reset link will be sent' };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; userId?: string; message: string }> {
    try {
      const resetRecord = await db.get(
        `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
         WHERE token = ?`,
        [token]
      );

      if (!resetRecord) {
        return { valid: false, message: 'Invalid or expired reset token' };
      }

      if (resetRecord.used_at) {
        return { valid: false, message: 'This reset token has already been used' };
      }

      const expiresAt = new Date(resetRecord.expires_at).getTime();
      if (Date.now() > expiresAt) {
        return { valid: false, message: 'This reset token has expired' };
      }

      return { valid: true, userId: resetRecord.user_id, message: 'Token is valid' };
    } catch (error) {
      console.error('Error validating reset token:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate token
      const validation = await this.validateResetToken(token);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      const userId = validation.userId!;

      // Hash the new password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await db.run(
        'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        [hashedPassword, new Date().toISOString(), userId]
      );

      // Mark token as used
      await db.run(
        'UPDATE password_reset_tokens SET used_at = ? WHERE token = ?',
        [new Date().toISOString(), token]
      );

      // Clean up expired tokens for this user
      await db.run(
        `DELETE FROM password_reset_tokens 
         WHERE user_id = ? AND expires_at < ?`,
        [userId, new Date().toISOString()]
      );

      return { success: true, message: 'Password has been reset successfully' };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
}

export const passwordResetService = new PasswordResetService();
