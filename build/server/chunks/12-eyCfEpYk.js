import { r as redirect, f as fail } from './index-BmA2ZghE.js';
import { c as cookie } from './cookie-CxBKF6rI.js';
import './constants.server-ClstHRc7.js';
import debug from 'debug';
import 'neverthrow';
import './db-DArO5U0k.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';
import 'bcryptjs';
import 'crypto';
import './shared-server-DaWdgxVh.js';

async function load(event) {
  const { user } = await event.parent();
  if (user) throw redirect(303, "/dashboard");
  return { title: "Log In" };
}

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const log = debug("app:routes:login:page.server");
const actions = {
  async default(event) {
    const data = await event.request.formData();
    const email = data.get("email");
    const password = data.get("password");
    const resp = await cookie.login({
      email,
      password,
      opts: { cookies: event.cookies }
    });
    if (resp.isErr()) {
      const error = (String(resp.error) ?? "No account with that email or username could be found.").trim();
      return fail(401, { email, error });
    }
    const user = resp.value;
    log("user:", user);
    throw redirect(303, "/dashboard");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions
});

const index = 12;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DbaxF1un.js')).default;
const universal_id = "src/routes/login/+page.ts";
const server_id = "src/routes/login/+page.server.ts";
const imports = ["_app/immutable/nodes/12.DaJJE_mF.js","_app/immutable/chunks/D8gIf4Uv.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/CgXUoIGW.js","_app/immutable/chunks/DzUKuoAr.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/EyRQZfWT.js","_app/immutable/chunks/Ujwe2Jf3.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/D3PPovqn.js","_app/immutable/chunks/DrxDDKw4.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/DmIcBnwA.js"];
const stylesheets = ["_app/immutable/assets/fa.CSovSTfp.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=12-eyCfEpYk.js.map
