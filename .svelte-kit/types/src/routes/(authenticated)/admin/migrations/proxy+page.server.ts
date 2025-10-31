// @ts-nocheck
import type { PageServerLoad } from './$types';

export const load = async ({ fetch }: Parameters<PageServerLoad>[0]) => {
  const res = await fetch('/(authenticated)/admin/migrations');
  if (!res.ok) {
    return { migrations: [] };
  }
  const body = await res.json();
  return { migrations: body.migrations || [] };
};

export const prerender = false;
