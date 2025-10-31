import { c as cookie } from './cookie-CxBKF6rI.js';
import { g as get } from './db-DArO5U0k.js';

async function validateToken(token, cookies) {
  return cookie.validate_session({ token, opts: { cookies } });
}
async function getUserFromCookies(cookies) {
  const token = cookies.get("auth_token");
  if (!token) return null;
  try {
    const resp = await validateToken(token, cookies);
    if (typeof resp.isErr === "function") {
      if (resp.isErr()) return null;
      return resp.value;
    }
    return resp;
  } catch (err) {
    console.error("[auth:helpers] getUserFromCookies error", err);
    return null;
  }
}
async function isAdmin(cookies) {
  const user = await getUserFromCookies(cookies);
  if (!user || !user.email) return false;
  try {
    const row = await get("SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)", [user.email]);
    return !!row;
  } catch (err) {
    console.error("[auth:helpers] isAdmin db check error", err);
    return false;
  }
}

export { getUserFromCookies as g, isAdmin as i };
//# sourceMappingURL=helpers-S__xQH7Y.js.map
