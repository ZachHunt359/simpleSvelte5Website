import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/(authenticated)/admin/migrations');
  if (!res.ok) {
    return { migrations: [] };
  }
  const body = await res.json();
  return { migrations: body.migrations || [] };
};

export const prerender = false;
