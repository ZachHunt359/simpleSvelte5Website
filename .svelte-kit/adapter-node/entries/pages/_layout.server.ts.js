import { g as getUserFromCookies } from "../../chunks/helpers.js";
const load = async ({ cookies }) => {
  const user = await getUserFromCookies(cookies);
  return { user };
};
export {
  load
};
