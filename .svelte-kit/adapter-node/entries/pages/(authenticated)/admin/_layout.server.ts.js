import { redirect } from "@sveltejs/kit";
import { g as get } from "../../../../chunks/db.js";
const load = async ({ parent }) => {
  const { user } = await parent();
  if (!user) throw redirect(303, "/login");
  const adminRow = await get("SELECT Id FROM AdminUsers WHERE lower(Email) = lower(?)", [user.email]);
  if (!adminRow) {
    throw redirect(303, "/");
  }
  return { user };
};
export {
  load
};
