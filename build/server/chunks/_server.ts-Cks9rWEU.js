import { r as run } from './db-DArO5U0k.js';
import { a as logError } from './logger-C0P_e9_2.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

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

export { POST };
//# sourceMappingURL=_server.ts-Cks9rWEU.js.map
