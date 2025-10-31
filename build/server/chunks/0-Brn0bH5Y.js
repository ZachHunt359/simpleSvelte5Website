import { g as getUserFromCookies } from './helpers-S__xQH7Y.js';
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
  const user = await getUserFromCookies(cookies);
  return { user };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-DTBhT_XC.js')).default;
const server_id = "src/routes/+layout.server.ts";
const imports = ["_app/immutable/nodes/0.CzKW9C8v.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/BsNfQ5Ie.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/Bi7TOvI8.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js","_app/immutable/chunks/DmIcBnwA.js"];
const stylesheets = ["_app/immutable/assets/0.BgzqMfpp.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=0-Brn0bH5Y.js.map
