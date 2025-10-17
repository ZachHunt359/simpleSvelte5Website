import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { get } from '$lib/db';

export const load: LayoutServerLoad = async ({ parent }) => {
  // parent() should provide the `user` from your root +layout.server.ts
  const { user } = await parent();
  if (!user) throw redirect(303, '/login');

  const adminRow = await get('SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)', [user.email]);
  if (!adminRow) {
    // logged-in but not an admin — send them away
    throw redirect(303, '/');
  }

  return { user };
};