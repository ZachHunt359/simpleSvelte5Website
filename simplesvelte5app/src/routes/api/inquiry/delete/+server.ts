import { run } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';
import { logError } from '$lib/logger';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    if (!id) return new Response(JSON.stringify({ success: false, error: 'missing id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  // Run delete and return success; adapter may not return a 'changes' count, so we return success boolean
  await run('DELETE FROM Inquiries WHERE Id = ?', [id]);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[api/inquiry/delete] error', { stack });
    return new Response(JSON.stringify({ success: false, error: String(err?.message || err), __fallbackError: 'Delete failed (see server logs)' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
