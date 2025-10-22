import { json } from '@sveltejs/kit';
import { getUserFromCookies, isAdmin } from '$lib/auth/helpers';

export async function GET({ cookies }) {
  try {
    const user = await getUserFromCookies(cookies);
    const admin = await isAdmin(cookies);
    return json({ authenticated: !!user, isAdmin: !!admin, user: user ? { id: user.id, email: user.email } : null });
  } catch (e) {
    return json({ authenticated: false, isAdmin: false, error: String(e) }, { status: 500 });
  }
}
