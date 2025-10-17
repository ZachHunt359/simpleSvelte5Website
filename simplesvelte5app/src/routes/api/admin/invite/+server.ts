import type { RequestHandler } from '@sveltejs/kit';
import { run } from '$lib/db';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { isAdmin, getUserFromCookies } from '$lib/auth/helpers';
import { logError, logInfo } from '$lib/logger';
import { env } from '$env/dynamic/private';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(env.SMTP_PORT ?? 587),
  secure: Number(env.SMTP_PORT ?? 587) === 465,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined
});

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    if (!(await isAdmin(cookies))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { email } = await request.json();
    if (!email) return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400 });

    const code = randomBytes(24).toString('hex'); // 48-char hex, hard to brute-force
    const epoch = Math.floor(Date.now() / 1000);
  await run('INSERT INTO InviteCodes (Code, Used, CreatedAt) VALUES (?, 0, ?)', [code, epoch]);

    // audit log: who created the invite
    try {
      const actor = await getUserFromCookies(cookies);
      const actorEmail = actor?.email ?? 'unknown';
      await logInfo('[invite] created', { actor: actorEmail, code, email, createdAt: epoch });
    } catch (e) {
      // swallow logging errors
    }

    const origin = env.SITE_ORIGIN ?? 'http://localhost:5173';
    const registerUrl = `${origin}/register?code=${encodeURIComponent(code)}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Comic Invites" <no-reply@local>',
      to: email,
      subject: 'Admin invite',
      text: `You were invited as an admin. Register: ${registerUrl}\nCode: ${code}`,
      html: `<p>You were invited as an admin.</p><p><a href="${registerUrl}">Register</a></p><p>Code: <strong>${code}</strong></p>`
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    try {
      logError('[invite] error', { message: err?.message ?? String(err), stack: err?.stack ?? null });
    } catch (e) {
      // swallow
    }
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};