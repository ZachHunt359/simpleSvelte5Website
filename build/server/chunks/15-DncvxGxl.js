import { r as redirect, f as fail } from './index-BmA2ZghE.js';
import { c as cookie } from './cookie-CxBKF6rI.js';
import { A as AUTH_TOKEN_EXPIRY_SECONDS } from './constants.server-ClstHRc7.js';
import 'debug';
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
  if (user) throw redirect(303, "/");
  return { title: "Sign Up" };
}

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const email = (form.get("email") || "").trim();
    const password = (form.get("password") || "").trim();
    const password_confirm = (form.get("password-confirm") || "").trim();
    if (!email)
      return fail(422, { email, error: "An email address is required." });
    if (!password)
      return fail(422, { email, error: "A password is required." });
    if (password.length < 8)
      return fail(422, {
        email,
        error: "Password must be at least 8 characters long."
      });
    if (password.length > 32)
      return fail(422, {
        email,
        error: "Password cannot be more than 32 characters long."
      });
    if (password !== password_confirm)
      return fail(422, {
        email,
        error: "Your passwords must match."
      });
    const signup_resp = await cookie.signup({
      email,
      password,
      password_confirm,
      opts: { cookies: event.cookies }
    });
    if (signup_resp.isErr()) {
      const error = (String(signup_resp.error) ?? "There was an issue creating your account. Please try again.").trim();
      return fail(500, { email, error });
    }
    const login_resp = await cookie.login({
      email,
      password,
      opts: { cookies: event.cookies }
    });
    if (login_resp.isErr()) {
      const error = (String(login_resp.error) ?? "Could not sign you in. Please try again.").trim();
      return fail(500, { email, error });
    }
    const user = login_resp.value;
    if (user?.id && user?.token) {
      event.cookies.set("auth_token", `${user.id}:${user.token}`, {
        path: "/",
        maxAge: AUTH_TOKEN_EXPIRY_SECONDS,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
    }
    delete user.token;
    throw redirect(303, "/dashboard");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions
});

const index = 15;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BEm-fkKp.js')).default;
const universal_id = "src/routes/signup/+page.ts";
const server_id = "src/routes/signup/+page.server.ts";
const imports = ["_app/immutable/nodes/15.BOqMYouP.js","_app/immutable/chunks/D8gIf4Uv.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/CgXUoIGW.js","_app/immutable/chunks/DzUKuoAr.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/EyRQZfWT.js","_app/immutable/chunks/Ujwe2Jf3.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/D3PPovqn.js","_app/immutable/chunks/DrxDDKw4.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/DmIcBnwA.js"];
const stylesheets = ["_app/immutable/assets/fa.CSovSTfp.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=15-DncvxGxl.js.map
