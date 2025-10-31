import { f as fail, r as redirect, e as error } from './index-BmA2ZghE.js';
import { g as get, r as run } from './db-DArO5U0k.js';
import bcrypt from 'bcryptjs';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';

const load = async ({ url }) => {
  const code = url.searchParams.get("code");
  if (!code) throw error(404, "Invite code required");
  const row = await get("SELECT Code, Used FROM InviteCodes WHERE Code = ?", [code]);
  if (!row || row.Used) throw error(404, "Invalid or used invite code");
  return { code };
};
const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const email = (form.get("email") || "").trim().toLowerCase();
    const password = form.get("password") || "";
    const code = (form.get("code") || "").trim();
    if (!email || !password || !code) {
      return fail(400, { error: "All fields required", code, email });
    }
    if (password.length < 8) {
      return fail(400, { error: "Password must be at least 8 characters", code, email });
    }
    const invite = await get("SELECT Code, Used FROM InviteCodes WHERE Code = ?", [code]);
    if (!invite || invite.Used) {
      return fail(400, { error: "Invalid or already used invite code" });
    }
    const existing = await get("SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)", [email]);
    if (existing) {
      return fail(400, { error: "An admin with that email already exists" });
    }
    const hash = bcrypt.hashSync(password, 10);
    const epoch = Math.floor(Date.now() / 1e3);
    const info = await run("INSERT INTO AdminUsers (Email, PasswordHash, CreatedAt) VALUES (?, ?, ?)", [email, hash, epoch]);
    const newAdminId = info && (info.insertId ?? info.lastInsertRowid) || null;
    await run("UPDATE InviteCodes SET Used = 1, UsedBy = ?, UsedAt = ? WHERE Code = ?", [newAdminId ?? email, epoch, code]);
    throw redirect(303, "/login");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 14;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CfChgwS7.js')).default;
const server_id = "src/routes/register/+page.server.ts";
const imports = ["_app/immutable/nodes/14.DI9eGySe.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/Ds2k93Or.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=14-BZrzO1VO.js.map
