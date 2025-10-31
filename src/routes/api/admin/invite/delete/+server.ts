import type { RequestHandler } from '@sveltejs/kit';
import { isAdmin, getUserFromCookies } from '$lib/auth/helpers';
import { run } from '$lib/db';
import { logError } from '$lib/logger';
import { logInfo } from '$lib/logger';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    if (!(await isAdmin(cookies))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { code } = await request.json();
    if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 });

  const res = await run('DELETE FROM InviteCodes WHERE Code = ?', [code]);

    try {
      const actor = await getUserFromCookies(cookies);
      const actorEmail = actor?.email ?? 'unknown';
      await logInfo('[invite:deleted]', { actor: actorEmail, code, changes: res.changes });
    } catch (e) {
      // swallow
    }

  // mysql returns affectedRows; sqlite returns changes
  const changes = res && (res.affectedRows ?? res.changes ?? 0);
  return new Response(JSON.stringify({ success: true, changes }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    try { logError('[invite:delete] error', { message: err?.message ?? String(err), stack: err?.stack ?? null }); } catch (e) {}
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
