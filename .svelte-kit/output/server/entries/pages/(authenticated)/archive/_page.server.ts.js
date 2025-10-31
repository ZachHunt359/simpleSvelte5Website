import { g as get, q as query } from "../../../../chunks/db.js";
import { a as logError } from "../../../../chunks/logger.js";
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
export {
  load
};
