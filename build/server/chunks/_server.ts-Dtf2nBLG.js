import { r as run } from './db-DArO5U0k.js';
import { a as logError } from './logger-C0P_e9_2.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

const POST = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    if (!id) return new Response(JSON.stringify({ success: false, error: "missing id" }), { status: 400, headers: { "Content-Type": "application/json" } });
    await run("DELETE FROM Inquiries WHERE Id = ?", [id]);
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/inquiry/delete] error", { stack });
    return new Response(JSON.stringify({ success: false, error: String(err?.message || err), __fallbackError: "Delete failed (see server logs)" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export { POST };
//# sourceMappingURL=_server.ts-Dtf2nBLG.js.map
