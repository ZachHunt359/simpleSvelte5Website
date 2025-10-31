import { q as query } from "../../../../chunks/db.js";
import { a as logError } from "../../../../chunks/logger.js";
const GET = async ({ url }) => {
  try {
    const userId = url.searchParams.get("userId");
    if (!userId) return new Response(JSON.stringify([]), { status: 200 });
    const rows = await query(
      `
        SELECT
          Id    AS id,
          UserId AS userId,
          Message AS message,
          Email AS email,
          Reply AS reply,
          SeenByUser AS seen,
          CAST(MessTimestamp AS INTEGER) AS messTimestamp,
          ReplyTimestamp AS replyTimestamp
        FROM Inquiries
        WHERE UserId = ?
        ORDER BY CAST(MessTimestamp AS INTEGER) DESC
      `,
      [userId]
    );
    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/inquiries] GET error", { stack });
    return new Response(JSON.stringify({ error: "Server error", __fallbackError: "Failed to load inquiries (see server logs)" }), { status: 500 });
  }
};
export {
  GET
};
