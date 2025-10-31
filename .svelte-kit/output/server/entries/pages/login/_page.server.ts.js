import { c as cookie } from "../../../chunks/cookie.js";
import "../../../chunks/constants.server.js";
import { fail, redirect } from "@sveltejs/kit";
import debug from "debug";
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
export {
  actions
};
