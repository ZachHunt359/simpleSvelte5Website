// @ts-nocheck
import type { PageServerLoad } from './$types';
import { isAdmin } from '$lib/auth/helpers';
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }: Parameters<PageServerLoad>[0]) => {
  if (!(await isAdmin(cookies))) {
    throw redirect(303, '/');
  }
  return {};
};
