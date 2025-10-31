import type { RequestHandler } from '@sveltejs/kit';
import { run } from '$lib/db';
import { logError } from '$lib/logger';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userId, inquiryIds } = await request.json();
    if (!userId || !Array.isArray(inquiryIds)) {
      return new Response(JSON.stringify({ error: 'Missing userId or inquiryIds' }), { status: 400 });
    }

    // Run sequential UPDATEs to mark inquiries seen (works for SQLite and MySQL)
    for (const id of inquiryIds) {
      await run(`UPDATE Inquiries SET SeenByUser = 1 WHERE Id = ? AND UserId = ?`, [id, userId]);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[api/inquiry/seen] error', { stack });
    return new Response(JSON.stringify({ error: 'Server error', __fallbackError: 'Mark seen failed (see server logs)' }), { status: 500 });
  }
};