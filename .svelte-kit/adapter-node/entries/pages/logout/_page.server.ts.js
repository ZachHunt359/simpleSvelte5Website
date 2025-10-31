import { c as cookie } from "../../../chunks/cookie.js";
import { redirect } from "@sveltejs/kit";
const load = async ({ cookies }) => {
  try {
    await cookie.logout({ token: cookies.get("auth_token"), opts: { cookies } });
  } catch (err) {
    console.error("[logout] error", err);
  }
  throw redirect(303, "/login");
};
export {
  load
};
