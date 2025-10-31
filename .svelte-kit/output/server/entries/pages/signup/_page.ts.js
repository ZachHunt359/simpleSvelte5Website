import { redirect } from "@sveltejs/kit";
async function load(event) {
  const { user } = await event.parent();
  if (user) throw redirect(303, "/");
  return { title: "Sign Up" };
}
export {
  load
};
