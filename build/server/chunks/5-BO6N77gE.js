import { i as isAdmin } from './helpers-S__xQH7Y.js';
import { q as query } from './db-DArO5U0k.js';
import './cookie-CxBKF6rI.js';
import 'debug';
import 'neverthrow';
import 'bcryptjs';
import 'crypto';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

const load = async ({ cookies }) => {
  if (!await isAdmin(cookies)) {
    return { invites: [] };
  }
  const rows = await query(
    `SELECT ic.Code, ic.Used, ic.CreatedAt, ic.UseBy, ic.UsedAt, ic.AdminUsed, au.Email AS AdminEmail
       FROM InviteCodes ic
       LEFT JOIN AdminUsers au ON au.Id = ic.AdminUsed
       ORDER BY ic.CreatedAt DESC`
  );
  const invites = rows.map((r) => {
    let useByNum = null;
    if (r.UseBy == null) {
      useByNum = null;
    } else if (typeof r.UseBy === "number") {
      useByNum = r.UseBy;
    } else if (typeof r.UseBy === "string") {
      const parsed = Number(r.UseBy);
      if (Number.isFinite(parsed)) {
        useByNum = parsed;
      } else {
        useByNum = typeof r.CreatedAt === "number" ? r.CreatedAt + 24 * 60 * 60 : null;
      }
    }
    return {
      Code: r.Code,
      Used: !!r.Used,
      CreatedAt: r.CreatedAt,
      UseBy: useByNum,
      UsedAt: r.UsedAt || null,
      AdminUsed: r.AdminUsed || null,
      AdminEmail: r.AdminEmail || null
    };
  });
  return { invites };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DvwZ3Ktd.js')).default;
const server_id = "src/routes/(authenticated)/admin/invite/+page.server.ts";
const imports = ["_app/immutable/nodes/5.7rPGHfCd.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CB3tKw_3.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/D3PPovqn.js","_app/immutable/chunks/Ds2k93Or.js","_app/immutable/chunks/Bfc47y5P.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-BO6N77gE.js.map
