import { c as cookie } from './cookie-CxBKF6rI.js';
import { r as redirect } from './index-BmA2ZghE.js';
import { q as query } from './db-DArO5U0k.js';
import { a as logError } from './logger-C0P_e9_2.js';
import { i as isAdmin } from './helpers-S__xQH7Y.js';
import 'debug';
import 'neverthrow';
import 'bcryptjs';
import 'crypto';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 9;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BCouaXhs.js')).default;
const server_id = "src/routes/(authenticated)/dashboard/+page.server.ts";
const imports = ["_app/immutable/nodes/9.BpR8ouHB.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CB3tKw_3.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/Ds2k93Or.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
const stylesheets = ["_app/immutable/assets/9.BQmZotTF.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=9-DobhLLJp.js.map
