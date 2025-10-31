import { g as get, q as query } from './db-DArO5U0k.js';
import { a as logError } from './logger-C0P_e9_2.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

async function load({ url }) {
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const perPage = 20;
  const offset = (page - 1) * perPage;
  let where = "WHERE SeenByUser = 1";
  const params = [];
  if (q) {
    where += " AND (Email LIKE ? OR Reply LIKE ? OR SentMessageId LIKE ?)";
    const like = `%${q.replace(/%/g, "\\%")}%`;
    params.push(like, like, like);
  }
  try {
    const totalRow = await get(`SELECT COUNT(1) as cnt FROM Inquiries ${where}`, params.length ? params : void 0);
    const total = totalRow?.cnt || 0;
    const rows = await query(`
      SELECT
        Id as id,
        UserId as userId,
        Email as email,
        Reply as reply,
        SentMessageId as messageId,
        CAST(ReplyTimestamp AS INTEGER) as replyTimestamp
      FROM Inquiries
      ${where}
      ORDER BY COALESCE(ReplyTimestamp, CAST(MessTimestamp AS INTEGER)) DESC
      LIMIT ? OFFSET ?
  `, params.length ? [...params, perPage, offset] : [perPage, offset]);
    return { archived: rows, page, perPage, total, q };
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[archive] load error", { stack, q, page, perPage });
    return { archived: [], page, perPage, total: 0, q, __fallbackError: "Failed to load archive (see server logs)" };
  }
}

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DTvN5WrH.js')).default;
const server_id = "src/routes/(authenticated)/archive/+page.server.ts";
const imports = ["_app/immutable/nodes/8.taWdZvMd.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/DzUKuoAr.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/EyRQZfWT.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CB3tKw_3.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/Ds2k93Or.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
const stylesheets = ["_app/immutable/assets/8.DrGe7rKu.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-BLntcYJ2.js.map
