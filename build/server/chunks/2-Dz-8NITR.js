import { r as redirect } from './index-BmA2ZghE.js';
import debug from 'debug';
import { a as logError } from './logger-C0P_e9_2.js';
import { i as isAdmin } from './helpers-S__xQH7Y.js';
import './cookie-CxBKF6rI.js';
import 'neverthrow';
import './db-DArO5U0k.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';
import 'bcryptjs';
import 'crypto';

var _layout_ts = /*#__PURE__*/Object.freeze({
  __proto__: null
});

const log = debug("app:routes:(authenticated):layout");
async function load(event) {
  try {
    const parent_user = (await event.parent())?.user;
    const locals_user = event.locals?.user;
    log("parent_user:", parent_user);
    log("locals_user:", locals_user);
    const user = locals_user || parent_user;
    log("user:", user);
    if (!user) {
      log("no user, redirecting to /login");
      throw redirect(301, "/login");
    }
    const admin = await isAdmin(event.cookies);
    return { user, isAdmin: admin };
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && typeof err.status === "number" && err.status >= 300 && err.status < 400) {
      throw err;
    }
    const stack = err && err.stack ? err.stack : String(err);
    logError("[layout] load error", { stack });
    return { user: null, __fallbackError: "Failed to load user session (see server logs)" };
  }
}

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-DlOpI3PA.js')).default;
const universal_id = "src/routes/(authenticated)/+layout.ts";
const server_id = "src/routes/(authenticated)/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.iDB_oZ-B.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/BsNfQ5Ie.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
const stylesheets = ["_app/immutable/assets/2.BtLOpuxL.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets, _layout_ts as universal, universal_id };
//# sourceMappingURL=2-Dz-8NITR.js.map
