import { g as get, q as query } from './db-DArO5U0k.js';
import { a as logError } from './logger-C0P_e9_2.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

const GET = async ({ url }) => {
  try {
    const q = url.searchParams.get("q") || "";
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const perPage = Math.max(1, Math.min(100, Number(url.searchParams.get("perPage") || "20")));
    const offset = (page - 1) * perPage;
    let where = "WHERE SeenByUser = 1";
    const params = [];
    if (q) {
      where += " AND (Email LIKE ? OR Reply LIKE ? OR SentMessageId LIKE ?)";
      const like = `%${q.replace(/%/g, "%")}%`;
      params.push(like, like, like);
    }
    const totalRow = await get(`SELECT COUNT(1) as cnt FROM Inquiries ${where}`, params);
    const total = totalRow?.cnt || 0;
    const rows = await query(`SELECT Id as id, UserId as userId, Email as email, Reply as reply, SentMessageId as messageId, CAST(ReplyTimestamp AS INTEGER) as replyTimestamp FROM Inquiries ${where} ORDER BY COALESCE(ReplyTimestamp, CAST(MessTimestamp AS INTEGER)) DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
    return new Response(JSON.stringify({ archived: rows, page, perPage, total, q }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/inquiry/archive] GET error", { stack });
    return new Response(JSON.stringify({ archived: [], page: 1, perPage: 20, total: 0, q: "", __fallbackError: "Failed to load archive (see server logs)" }), { headers: { "Content-Type": "application/json" } });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-DFIPhnFu.js.map
