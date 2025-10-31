import { r as run, g as get } from './db-DArO5U0k.js';
import { a as logError } from './logger-C0P_e9_2.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

const POST = async ({ request }) => {
  try {
    const payload = await request.json();
    if (payload.message && payload.userId) {
      let sanitizePageSentFrom = function(raw) {
        let s = "";
        if (typeof raw === "string" && raw.trim() !== "") s = raw.trim();
        else {
          const ref = request.headers.get("referer") || request.headers.get("referrer") || "";
          if (ref) {
            try {
              const u = new URL(ref);
              s = u.pathname || "";
            } catch (e) {
              s = String(ref || "");
            }
          } else {
            s = "";
          }
        }
        s = s.split("?")[0].split("#")[0];
        s = s.replace(/^\/+/, "").replace(/\/+$/, "");
        s = s.replace(/[\x00-\x1F\x7F]/g, "");
        if (s.length > 200) s = s.slice(0, 200);
        return s || "(unknown)";
      };
      const epoch = Math.floor(Date.now() / 1e3);
      const pageSentFrom = sanitizePageSentFrom(payload.pageSentFrom);
      if (payload.id) {
        await run(`
          INSERT INTO Inquiries (Id, UserId, PageSentFrom, Message, Email, Reply, SeenByUser, MessTimestamp, ReplyTimestamp)
          VALUES (?, ?, ?, ?, ?, NULL, 0, ?, NULL)
        `, [payload.id, payload.userId, pageSentFrom, payload.message, payload.email ?? null, epoch]);
        return new Response(JSON.stringify({ success: true, id: String(payload.id) }), { status: 200 });
      } else {
        await run(`
          INSERT INTO Inquiries (UserId, PageSentFrom, Message, Email, Reply, SeenByUser, MessTimestamp, ReplyTimestamp)
          VALUES (?, ?, ?, ?, NULL, 0, ?, NULL)
        `, [payload.userId, pageSentFrom, payload.message, payload.email ?? null, epoch]);
        const last = await get(`SELECT MAX(Id) as id FROM Inquiries`);
        const id = last && last.id ? String(last.id) : null;
        return new Response(JSON.stringify({ success: true, id }), { status: 200 });
      }
    }
    if (payload.id && payload.email && payload.userId) {
      await run(`UPDATE Inquiries SET Email = ? WHERE Id = ? AND UserId = ?`, [payload.email, payload.id, payload.userId]);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/inquiry] POST error", { stack });
    return new Response(JSON.stringify({ error: "Server error", __fallbackError: "Failed to create inquiry (see server logs)" }), { status: 500 });
  }
};

export { POST };
//# sourceMappingURL=_server.ts-CzzojBsE.js.map
