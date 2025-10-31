import { r as run } from './db-DArO5U0k.js';
import { a as logError } from './logger-C0P_e9_2.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

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

export { POST };
//# sourceMappingURL=_server.ts-CsjayAig.js.map
