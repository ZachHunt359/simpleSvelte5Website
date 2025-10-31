import { c as cookie } from './cookie-CxBKF6rI.js';
import { r as redirect } from './index-BmA2ZghE.js';
import 'debug';
import 'neverthrow';
import './db-DArO5U0k.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';
import 'bcryptjs';
import 'crypto';

const load = async ({ cookies }) => {
  try {
    await cookie.logout({ token: cookies.get("auth_token"), opts: { cookies } });
  } catch (err) {
    console.error("[logout] error", err);
  }
  throw redirect(303, "/login");
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 13;
const server_id = "src/routes/logout/+page.server.ts";
const imports = [];
const stylesheets = [];
const fonts = [];

export { fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=13-DPeN61R_.js.map
