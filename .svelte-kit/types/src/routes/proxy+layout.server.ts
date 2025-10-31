// @ts-nocheck
import type { LayoutServerLoad } from './$types';
import { getUserFromCookies } from '$lib/auth/helpers';

export const load = async ({ cookies }: Parameters<LayoutServerLoad>[0]) => {
  const user = await getUserFromCookies(cookies);
  return { user };
};