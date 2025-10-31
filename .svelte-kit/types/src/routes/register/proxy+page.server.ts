// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { get, run } from '$lib/db';
import bcrypt from 'bcryptjs';

export const load = async ({ url }: Parameters<PageServerLoad>[0]) => {
  const code = url.searchParams.get('code');
  if (!code) throw error(404, 'Invite code required');

  const row = await get('SELECT Code, Used FROM InviteCodes WHERE Code = ?', [code]);
  if (!row || row.Used) throw error(404, 'Invalid or used invite code');

  return { code };
};

export const actions = {
  default: async ({ request }: import('./$types').RequestEvent) => {
    const form = await request.formData();
    const email = (form.get('email') as string || '').trim().toLowerCase();
    const password = form.get('password') as string || '';
    const code = (form.get('code') as string || '').trim();

    if (!email || !password || !code) {
      return fail(400, { error: 'All fields required', code, email });
    }
    if (password.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters', code, email });
    }

    // Verify invite again (atomic-ish)
    const invite = await get('SELECT Code, Used FROM InviteCodes WHERE Code = ?', [code]);
    if (!invite || invite.Used) {
      return fail(400, { error: 'Invalid or already used invite code' });
    }

    // Ensure email not already used in AdminUsers
    const existing = await get('SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)', [email]);
    if (existing) {
      return fail(400, { error: 'An admin with that email already exists' });
    }

    // Hash password and insert admin
    const hash = bcrypt.hashSync(password, 10);
    const epoch = Math.floor(Date.now() / 1000);
    const info = await run('INSERT INTO AdminUsers (Email, PasswordHash, CreatedAt) VALUES (?, ?, ?)', [email, hash, epoch]);
    // Normalize insert id across mysql and sqlite
    const newAdminId = (info && (info.insertId ?? info.lastInsertRowid)) || null;

  // mark invite used; record which admin id used it (AdminUsed), and timestamp
  await run('UPDATE InviteCodes SET Used = 1, AdminUsed = ?, UsedAt = ? WHERE Code = ?', [newAdminId, epoch, code]);

    // redirect to login (or dashboard)
    throw redirect(303, '/login');
  }
};;null as any as Actions;