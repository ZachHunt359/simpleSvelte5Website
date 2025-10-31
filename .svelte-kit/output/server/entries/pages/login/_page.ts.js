import { redirect } from "@sveltejs/kit";
async function load(event) {
  const { user } = await event.parent();
  if (user) throw redirect(303, "/dashboard");
  return { title: "Log In" };
}
export {
  load
};
