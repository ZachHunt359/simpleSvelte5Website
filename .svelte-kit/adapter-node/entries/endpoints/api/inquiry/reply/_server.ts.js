import { r as run } from "../../../../../chunks/db.js";
import { a as logError } from "../../../../../chunks/logger.js";
const POST = async ({ request }) => {
  try {
    const { id, reply } = await request.json();
    if (!id || typeof reply !== "string") {
      return new Response(JSON.stringify({ error: "Missing id or reply" }), { status: 400 });
    }
    const epoch = Math.floor(Date.now() / 1e3);
    await run(`UPDATE Inquiries SET Reply = ?, ReplyTimestamp = ? WHERE Id = ?`, [reply, epoch, id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/inquiry/reply] error", { stack });
    return new Response(JSON.stringify({ error: "Server error", __fallbackError: "Reply failed (see server logs)" }), { status: 500 });
  }
};
export {
  POST
};
