import { validateToken } from '$lib/auth';
import { get } from '$lib/db';

export async function getUserFromCookies(cookies: import('@sveltejs/kit').Cookies) {
  const token = cookies.get('auth_token');
  console.log('[helpers.getUserFromCookies] auth_token from cookies:', token ? `${token.substring(0, 20)}...` : 'NULL');
  if (!token) return null;
  try {
    const resp = await validateToken(token, cookies);
    console.log('[helpers.getUserFromCookies] validateToken response type:', typeof (resp as any).isErr);
    if (typeof (resp as any).isErr === 'function') {
      if ((resp as any).isErr()) {
        console.log('[helpers.getUserFromCookies] validateToken returned error:', (resp as any).error);
        return null;
      }
      console.log('[helpers.getUserFromCookies] validateToken success, user:', (resp as any).value);
      return (resp as any).value;
    }
    console.log('[helpers.getUserFromCookies] validateToken returned non-Result value:', resp);
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