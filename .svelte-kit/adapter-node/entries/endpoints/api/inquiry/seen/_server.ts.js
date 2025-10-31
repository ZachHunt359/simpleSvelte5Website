import { r as run } from "../../../../../chunks/db.js";
import { a as logError } from "../../../../../chunks/logger.js";
const POST = async ({ request }) => {
  try {
    const { userId, inquiryIds } = await request.json();
    if (!userId || !Array.isArray(inquiryIds)) {
      return new Response(JSON.stringify({ error: "Missing userId or inquiryIds" }), { status: 400 });
    }
    for (const id of inquiryIds) {
      await run(`UPDATE Inquiries SET SeenByUser = 1 WHERE Id = ? AND UserId = ?`, [id, userId]);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/inquiry/seen] error", { stack });
    return new Response(JSON.stringify({ error: "Server error", __fallbackError: "Mark seen failed (see server logs)" }), { status: 500 });
  }
};
export {
  POST
};
