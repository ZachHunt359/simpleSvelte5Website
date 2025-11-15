import type { RequestHandler } from '@sveltejs/kit';
import { run } from '$lib/db';
import { logError } from '$lib/logger';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { id, reply, imageUrl } = await request.json();
    if (!id || typeof reply !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing id or reply' }), { status: 400 });
    }
  const epoch = Math.floor(Date.now() / 1000);
  await run(`UPDATE Inquiries SET Reply = ?, ReplyTimestamp = ?, ReplyImageUrl = ? WHERE Id = ?`, [reply, epoch, imageUrl || null, id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[api/inquiry/reply] error', { stack });
    return new Response(JSON.stringify({ error: 'Server error', __fallbackError: 'Reply failed (see server logs)' }), { status: 500 });
  }
};