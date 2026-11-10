import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = this.initializeTransporter();
  }

  private initializeTransporter(): nodemailer.Transporter {
    const emailProvider = process.env.EMAIL_PROVIDER || 'mailgun';

    if (emailProvider === 'mailgun') {
      return nodemailer.createTransport({
        host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
        port: parseInt(process.env.MAILGUN_SMTP_PORT || '587'),
        secure: process.env.MAILGUN_SMTP_SECURE === 'true',
        auth: {
          user: process.env.MAILGUN_SMTP_USER,
          pass: process.env.MAILGUN_SMTP_PASS,
        },
      });
    }

    if (emailProvider === 'smtp') {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    throw new Error(`Unsupported email provider: ${emailProvider}`);
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    username: string
  ): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@lens-flare.local';

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Reset Your Lens Flare Password',
      html: `
        <p>Hi ${username},</p>
        <p>We received a request to reset your Lens Flare password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        <p>Or copy and paste this link: <code>${resetUrl}</code></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>Lens Flare Team</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✓ Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✓ Email service connected');
      return true;
    } catch (error) {
      console.error('✗ Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
