import type { RequestHandler } from '@sveltejs/kit';
import { run, get } from '$lib/db';
import { logError } from '$lib/logger';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json();
  // Use async DB API (query/get/run) so this handler works with SQLite or MySQL

    // Create new inquiry
    if (payload.message && payload.userId) {
      const epoch = Math.floor(Date.now() / 1000);

      // Determine PageSentFrom: prefer explicit payload, otherwise derive from Referer header pathname
      // Then sanitize: strip query/hash, trim slashes, remove control chars, and cap length.
      function sanitizePageSentFrom(raw: unknown): string {
        let s = '';
        if (typeof raw === 'string' && raw.trim() !== '') s = raw.trim();
        else {
          const ref = request.headers.get('referer') || request.headers.get('referrer') || '';
          if (ref) {
            try {
              const u = new URL(ref);
              s = u.pathname || '';
            } catch (e) {
              s = String(ref || '');
            }
          } else {
            s = '';
          }
        }

        // Remove any query string or fragment
        s = s.split('?')[0].split('#')[0];
        // Trim leading/trailing slashes
        s = s.replace(/^\/+/, '').replace(/\/+$/, '');
        // Remove control characters
        s = s.replace(/[\x00-\x1F\x7F]/g, '');
        // Cap length to 200 chars to avoid DB or UI issues
        if (s.length > 200) s = s.slice(0, 200);
        // Final fallback
        return s || '(unknown)';
      }

      const pageSentFrom = sanitizePageSentFrom(payload.pageSentFrom);

      if (payload.id) {
        // Insert with provided id
        await run(`
          INSERT INTO Inquiries (Id, UserId, PageSentFrom, Message, Email, Reply, SeenByUser, MessTimestamp, ReplyTimestamp)
          VALUES (?, ?, ?, ?, ?, NULL, 0, ?, NULL)
        `, [payload.id, payload.userId, pageSentFrom, payload.message, payload.email ?? null, epoch]);
        return new Response(JSON.stringify({ success: true, id: String(payload.id) }), { status: 200 });
      } else {
        // Let DB assign autoincrement Id (SQLite or MySQL)
        await run(`
          INSERT INTO Inquiries (UserId, PageSentFrom, Message, Email, Reply, SeenByUser, MessTimestamp, ReplyTimestamp)
          VALUES (?, ?, ?, ?, NULL, 0, ?, NULL)
        `, [payload.userId, pageSentFrom, payload.message, payload.email ?? null, epoch]);
        // Fetch last inserted id in a DB-agnostic way. For SQLite we can query last_insert_rowid(); for MySQL we can use LAST_INSERT_ID().
        // Our sqlite adapter returns run() result with lastInsertRowid; but the unified API hides that. We'll attempt a safe query.
        const last = await get(`SELECT MAX(Id) as id FROM Inquiries`);
        const id = last && last.id ? String(last.id) : null;
        return new Response(JSON.stringify({ success: true, id }), { status: 200 });
      }
    }

    // Attach email to existing inquiry (when user later provides email)
    if (payload.id && payload.email && payload.userId) {
      await run(`UPDATE Inquiries SET Email = ? WHERE Id = ? AND UserId = ?`, [payload.email, payload.id, payload.userId]);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[api/inquiry] POST error', { stack });
    return new Response(JSON.stringify({ error: 'Server error', __fallbackError: 'Failed to create inquiry (see server logs)' }), { status: 500 });
  }
};