import { r as redirect } from './index-BmA2ZghE.js';
import { g as get } from './db-DArO5U0k.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

const load = async ({ parent }) => {
  const { user } = await parent();
  if (!user) throw redirect(303, "/login");
  const adminRow = await get("SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)", [user.email]);
  if (!adminRow) {
    throw redirect(303, "/");
  }
  return { user };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./layout.svelte-4V-_rMCU.js')).default;
const server_id = "src/routes/(authenticated)/admin/+layout.server.ts";
const imports = ["_app/immutable/nodes/3.BDnJAglo.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/EyRQZfWT.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-W4amSKk6.js.map
