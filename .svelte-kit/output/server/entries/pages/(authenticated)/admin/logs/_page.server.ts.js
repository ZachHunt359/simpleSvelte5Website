import { i as isAdmin } from "../../../../../chunks/helpers.js";
import { redirect } from "@sveltejs/kit";
const load = async ({ cookies }) => {
  if (!await isAdmin(cookies)) {
    throw redirect(303, "/");
  }
  return {};
};
export {
  load
};
