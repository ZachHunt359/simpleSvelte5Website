import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import { query } from '$lib/db';
import { logError } from '$lib/logger';

export async function load() {
    try {
      const rows = await query(`
        SELECT
          Id as id,
          UserId as userId,
          PageSentFrom as pageSentFrom,
          Message as message,
          Email as email,
          Reply as reply,
          SeenByUser as seenByUser,
          CAST(MessTimestamp AS INTEGER) AS timestamp,
          ReplyTimestamp AS replyTimestamp
        FROM Inquiries
        WHERE SeenByUser = 0 OR SeenByUser IS NULL
        ORDER BY CAST(MessTimestamp AS INTEGER) DESC
  `);
      return { inquiries: rows };
    } catch (err: any) {
      const stack = err && err.stack ? err.stack : String(err);
      logError('[dashboard] load error', { stack });
      return { inquiries: [], __fallbackError: 'Failed to load inquiries (see server logs)' };
    }
}

export const actions = {
  logout: async ({ cookies }) => {
    // call adapter logout so session row is removed and cookie cleared
    try {
      await auth.logout({
        token: cookies.get('auth_token'),
        opts: { cookies }
      });
    } catch (err) {
      console.error('[dashboard] logout error', err);
      logError('[dashboard] logout error', { err: err && err.stack ? err.stack : String(err) });
    }
    throw redirect(303, '/login');
  }
};