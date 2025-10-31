import { r as run } from "../../../../../chunks/db.js";
import { a as logError } from "../../../../../chunks/logger.js";
const POST = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const days = Number(body?.days || 0);
    if (!days || days <= 0) return new Response(JSON.stringify({ success: false, error: "invalid days" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const cutoff = Math.floor(Date.now() / 1e3) - days * 24 * 60 * 60;
    await run("DELETE FROM Inquiries WHERE CAST(MessTimestamp AS INTEGER) < ?", [cutoff]);
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/inquiry/delete-old] error", { stack });
    return new Response(JSON.stringify({ success: false, error: String(err?.message || err), __fallbackError: "Bulk delete failed (see server logs)" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
export {
  POST
};
