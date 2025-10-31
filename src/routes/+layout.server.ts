import type { LayoutServerLoad } from './$types';
import { getUserFromCookies } from '$lib/auth/helpers';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const user = await getUserFromCookies(cookies);
  return { user };
};