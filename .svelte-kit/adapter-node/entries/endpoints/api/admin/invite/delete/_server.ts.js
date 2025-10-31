import { i as isAdmin, g as getUserFromCookies } from "../../../../../../chunks/helpers.js";
import { r as run } from "../../../../../../chunks/db.js";
import { l as logInfo, a as logError } from "../../../../../../chunks/logger.js";
const POST = async ({ request, cookies }) => {
  try {
    if (!await isAdmin(cookies)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
    const { code } = await request.json();
    if (!code) return new Response(JSON.stringify({ error: "Missing code" }), { status: 400 });
    const res = await run("DELETE FROM InviteCodes WHERE Code = ?", [code]);
    try {
      const actor = await getUserFromCookies(cookies);
      const actorEmail = actor?.email ?? "unknown";
      await logInfo("[invite:deleted]", { actor: actorEmail, code, changes: res.changes });
    } catch (e) {
    }
    const changes = res && (res.affectedRows ?? res.changes ?? 0);
    return new Response(JSON.stringify({ success: true, changes }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    try {
      logError("[invite:delete] error", { message: err?.message ?? String(err), stack: err?.stack ?? null });
    } catch (e) {
    }
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
};
export {
  POST
};
