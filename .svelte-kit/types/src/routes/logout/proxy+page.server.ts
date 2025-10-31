// @ts-nocheck
import type { PageServerLoad } from './$types';
import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }: Parameters<PageServerLoad>[0]) => {
  try {
    await auth.logout({ token: cookies.get('auth_token'), opts: { cookies } });
  } catch (err) {
    console.error('[logout] error', err);
  }
  throw redirect(303, '/login');
};