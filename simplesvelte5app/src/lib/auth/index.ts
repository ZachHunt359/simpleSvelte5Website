/**
 * Uncomment the auth adapter you'd like to use.
 * Please visit the readme for more information on how to use the adapters.
 */
import { cookie } from "./cookie";
import type { Cookies } from "@sveltejs/kit";
export { cookie as auth } from "./cookie";
// export { pocketbase as auth } from "./pocketbase";
export async function validateToken(token: string, cookies: Cookies) {
    // The cookie adapter expects { token, opts }
    return cookie.validate_session({ token, opts: { cookies } });
}