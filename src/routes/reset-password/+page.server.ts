import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { get, run } from '$lib/db';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	
	if (!token) {
		return { error: 'No reset token provided.' };
	}
	
	try {
		const now = Math.floor(Date.now() / 1000);
		const reset = await get(
			'SELECT Token, AdminUserId, ExpiresAt, Used FROM PasswordResets WHERE Token = ?',
			[token]
		);
		
		if (!reset) {
			return { error: 'Invalid or expired reset token.' };
		}
		
		if (reset.Used) {
			return { error: 'This reset link has already been used.' };
		}
		
		if (reset.ExpiresAt < now) {
			return { error: 'This reset link has expired.' };
		}
		
		return { token, valid: true };
		
	} catch (error) {
		console.error('[reset-password] Error:', error);
		return { error: 'An error occurred. Please try again.' };
	}
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const token = (data.get('token') as string || '').trim();
		const password = (data.get('password') as string || '').trim();
		const passwordConfirm = (data.get('password_confirm') as string || '').trim();
		
		if (!token) {
			return fail(400, { tokenError: 'No reset token provided.' });
		}
		
		if (!password) {
			return fail(400, { token, error: 'Password is required.' });
		}
		
		if (password.length < 8) {
			return fail(400, { token, error: 'Password must be at least 8 characters long.' });
		}
		
		if (password !== passwordConfirm) {
			return fail(400, { token, error: 'Passwords do not match.' });
		}
		
		try {
			const now = Math.floor(Date.now() / 1000);
			const reset = await get(
				'SELECT Token, AdminUserId, ExpiresAt, Used FROM PasswordResets WHERE Token = ?',
				[token]
			);
			
			if (!reset || reset.Used || reset.ExpiresAt < now) {
				return fail(400, { tokenError: 'Invalid or expired reset token.' });
			}
			
			// Hash new password
			const hash = bcrypt.hashSync(password, 10);
			
			// Update admin password
			await run(
				'UPDATE AdminUsers SET PasswordHash = ? WHERE Id = ?',
				[hash, reset.AdminUserId]
			);
			
			// Mark token as used
			await run(
				'UPDATE PasswordResets SET Used = 1 WHERE Token = ?',
				[token]
			);
			
			console.log('[reset-password] Password reset successful for admin ID:', reset.AdminUserId);
			
			throw redirect(303, '/login?reset=success');
			
		} catch (error) {
			if (error instanceof Response) throw error; // Re-throw redirects
			console.error('[reset-password] Error:', error);
			return fail(500, { token, error: 'An error occurred. Please try again.' });
		}
	}
};