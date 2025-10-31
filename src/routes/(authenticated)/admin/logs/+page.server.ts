import type { PageServerLoad } from './$types';
import { isAdmin } from '$lib/auth/helpers';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
  if (!(await isAdmin(cookies))) {
    throw redirect(303, '/');
  }
  return {};
};
