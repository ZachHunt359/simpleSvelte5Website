import { validateToken } from "$lib/auth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const token = cookies.get("auth_token");
  let user = null;
  if (token) {
    const resp = await validateToken(token, cookies);
    if (resp.isOk()) {
      user = resp.value;
    }
  }
  return { user };
};