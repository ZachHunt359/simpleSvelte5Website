import type { RequestHandler } from '@sveltejs/kit';
import { getUserFromCookies, isAdmin } from '$lib/auth/helpers';
import { touchAdmin } from '$lib/panelsHeartbeat';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Only allow admins to send heartbeats
    const admin = await isAdmin(cookies);
    if (!admin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    // Extract optional identifier but prefer server-side user identity
    const user = await getUserFromCookies(cookies);
    const id = (user && user.email) ? String(user.email).toLowerCase() : null;
    if (!id) return new Response(JSON.stringify({ error: 'Missing user identity' }), { status: 400 });

    touchAdmin(id);
    return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
