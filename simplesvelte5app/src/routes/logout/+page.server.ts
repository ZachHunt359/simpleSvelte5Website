import type { PageServerLoad } from './$types';
import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
  try {
    await auth.logout({ token: cookies.get('auth_token'), opts: { cookies } });
  } catch (err) {
    console.error('[logout] error', err);
  }
  throw redirect(303, '/login');
};