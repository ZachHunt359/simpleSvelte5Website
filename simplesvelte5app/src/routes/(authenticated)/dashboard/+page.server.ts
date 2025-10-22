import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import { query } from '$lib/db';
import { logError } from '$lib/logger';
import { isAdmin } from '$lib/auth/helpers';

export async function load(event) {
    try {
      // Defense-in-depth: ensure caller is admin before returning inquiries
      const admin = await isAdmin(event.cookies);
      if (!admin) throw redirect(303, '/login');

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
      // If the error is a redirect thrown above, rethrow so SvelteKit handles it.
      if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number' && err.status >= 300 && err.status < 400) {
        throw err;
      }
      const stack = err && err.stack ? err.stack : String(err);
      logError('[dashboard] load error', { stack });
      // For non-redirect failures, do not return inquiries: throw redirect to login
      throw redirect(303, '/login');
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