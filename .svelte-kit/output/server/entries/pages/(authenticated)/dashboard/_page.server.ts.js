import { c as cookie } from "../../../../chunks/cookie.js";
import { redirect } from "@sveltejs/kit";
import { q as query } from "../../../../chunks/db.js";
import { a as logError } from "../../../../chunks/logger.js";
import { i as isAdmin } from "../../../../chunks/helpers.js";
async function load(event) {
  try {
    const admin = await isAdmin(event.cookies);
    if (!admin) throw redirect(303, "/login");
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
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && typeof err.status === "number" && err.status >= 300 && err.status < 400) {
      throw err;
    }
    const stack = err && err.stack ? err.stack : String(err);
    logError("[dashboard] load error", { stack });
    throw redirect(303, "/login");
  }
}
const actions = {
  logout: async ({ cookies }) => {
    try {
      await cookie.logout({
        token: cookies.get("auth_token"),
        opts: { cookies }
      });
    } catch (err) {
      console.error("[dashboard] logout error", err);
      logError("[dashboard] logout error", { err: err && err.stack ? err.stack : String(err) });
    }
    throw redirect(303, "/login");
  }
};
export {
  actions,
  load
};
