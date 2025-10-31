import { i as isAdmin } from './helpers-S__xQH7Y.js';
import { r as redirect } from './index-BmA2ZghE.js';
import './cookie-CxBKF6rI.js';
import 'debug';
import 'neverthrow';
import './db-DArO5U0k.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';
import 'bcryptjs';
import 'crypto';

const load = async ({ cookies }) => {
  if (!await isAdmin(cookies)) {
    throw redirect(303, "/");
  }
  return {};
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CwVakkAK.js')).default;
const server_id = "src/routes/(authenticated)/admin/logs/+page.server.ts";
const imports = ["_app/immutable/nodes/6.CJN93Du2.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/DzUKuoAr.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/EyRQZfWT.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CB3tKw_3.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/Ds2k93Or.js","_app/immutable/chunks/Bfc47y5P.js","_app/immutable/chunks/DcBb0i4c.js"];
const stylesheets = ["_app/immutable/assets/6.BzgemZzH.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-7COmIPlQ.js.map
