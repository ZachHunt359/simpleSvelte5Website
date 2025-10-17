import type { RequestHandler } from '@sveltejs/kit';
import { run, transaction } from '$lib/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userId, inquiryIds } = await request.json();
    if (!userId || !Array.isArray(inquiryIds)) {
      return new Response(JSON.stringify({ error: 'Missing userId or inquiryIds' }), { status: 400 });
    }
    // Use transaction helper which works with mysql pool connections or sqlite db
    await transaction(async (tx) => {
      for (const id of inquiryIds) {
        await run('UPDATE Inquiries SET SeenByUser = 1 WHERE Id = ? AND UserId = ?', [id, userId]);
      }
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};