import { i as isAdmin, g as getUserFromCookies } from './helpers-S__xQH7Y.js';
import { r as run } from './db-DArO5U0k.js';
import { l as logInfo, a as logError } from './logger-C0P_e9_2.js';
import './cookie-CxBKF6rI.js';
import 'debug';
import 'neverthrow';
import 'bcryptjs';
import 'crypto';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

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

export { POST };
//# sourceMappingURL=_server.ts-Btaoffiw.js.map
