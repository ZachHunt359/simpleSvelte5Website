import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { get, run } from '$lib/db';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const RESET_TOKEN_EXPIRY = 60 * 60; // 1 hour

// Load environment variables if not already set (same pattern as inquiry send-email)
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const l = line.trim();
        if (!l || l.startsWith('#')) continue;
        const eq = l.indexOf('=');
        if (eq === -1) continue;
        const key = l.slice(0, eq).trim();
        let val = l.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
      console.log('[forgot-password] Loaded .env into process.env');
    }
  } catch (e) {
    console.warn('[forgot-password] Failed to read .env file:', e && e.message ? e.message : e);
  }
}

// Create email transporter (same pattern as inquiry send-email)
let transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').toString().trim();
  const smtpPort = Number((process.env.SMTP_PORT || 587).toString().trim());
  const smtpUser = process.env.SMTP_USER.toString().trim();
  const smtpPass = process.env.SMTP_PASS.toString().trim();

  console.log('[forgot-password] Using SMTP transport:', smtpHost, 'user=', smtpUser);
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: { user: smtpUser, pass: smtpPass },
    logger: true,
    debug: true
  });
} else {
  transporter = nodemailer.createTransport({ jsonTransport: true });
  console.log('[forgot-password] Using jsonTransport (no SMTP credentials)');
}

export const actions: Actions = {
  default: async ({ request, url }) => {
    const data = await request.formData();
    const email = (data.get('email') as string || '').trim().toLowerCase();

    if (!email) {
      return fail(400, { email, error: 'Email is required.' });
    }

    try {
      const admin = await get(
        'SELECT Id, Email FROM AdminUsers WHERE lower(Email) = lower(?)',
        [email]
      );

      if (!admin) {
        // Don't reveal if user exists or not (security best practice)
        return {
          success: true,
          message: 'If an account exists with that email, a password reset link will be sent shortly.'
        };
      }

      const token = randomBytes(32).toString('hex');
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + RESET_TOKEN_EXPIRY;

      await run(
        'INSERT INTO PasswordResets (Token, AdminUserId, CreatedAt, ExpiresAt) VALUES (?, ?, ?, ?)',
        [token, admin.Id, now, expiresAt]
      );

      const resetUrl = `${url.origin}/reset-password?token=${token}`;
      const fromHeader = (process.env.SMTP_FROM || process.env.SMTP_USER || '"Paranoid Comic" <no-reply@paranoidcomic.com>').toString().trim();

      // Send password reset email
      try {
        const emailText = `Hello,\n\nYou requested a password reset for your admin account.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nParanoid Comic Team`;
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>You requested a password reset for your admin account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
            </p>
            <p>Or copy and paste this URL into your browser:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${resetUrl}
            </p>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px;">Best regards,<br>Paranoid Comic Team</p>
          </div>
        `;

        const info = await transporter.sendMail({
          from: fromHeader,
          to: admin.Email,
          subject: 'Password Reset Request - Paranoid Comic',
          text: emailText,
          html: emailHtml
        });

        console.log('[forgot-password] Email sent successfully to:', admin.Email);
        console.log('[forgot-password] Message ID:', info.messageId);

      } catch (emailError: any) {
        console.error('[forgot-password] Failed to send email:', emailError);
        // Don't log the reset URL - security risk
        // Token is still in DB, admin can use CLI tool to regenerate if needed
        console.error('[forgot-password] MANUAL INTERVENTION REQUIRED - Token generated but email failed');
        console.error('[forgot-password] Admin email:', admin.Email);
      }

      return {
        success: true,
        message: 'If an account exists with that email, a password reset link will be sent shortly.'
      };

    } catch (error) {
      console.error('[forgot-password] Error:', error);
      return fail(500, { email, error: 'An error occurred. Please try again.' });
    }
  }
};