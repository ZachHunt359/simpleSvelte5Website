import { validateToken } from '$lib/auth';
import { get } from '$lib/db';

export async function getUserFromCookies(cookies: import('@sveltejs/kit').Cookies) {
  const token = cookies.get('auth_token');
  if (!token) return null;
  try {
    const resp = await validateToken(token, cookies);
    if (typeof (resp as any).isErr === 'function') {
      if ((resp as any).isErr()) return null;
      return (resp as any).value;
    }
    return resp;
  } catch (err) {
    console.error('[auth:helpers] getUserFromCookies error', err);
    return null;
  }
}

export async function isAdmin(cookies: import('@sveltejs/kit').Cookies) {
  const user = await getUserFromCookies(cookies);
  if (!user || !user.email) return false;
  try {
    const row = await get('SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)', [user.email]);
    return !!row;
  } catch (err) {
    console.error('[auth:helpers] isAdmin db check error', err);
    return false;
  }
}