import { redirect } from "@sveltejs/kit";
import debug from "debug";
import { a as logError } from "../../../chunks/logger.js";
import { i as isAdmin } from "../../../chunks/helpers.js";
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
export {
  load
};
