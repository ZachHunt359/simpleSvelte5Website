import { redirect } from "@sveltejs/kit";
import debug from "debug";
import type { LayoutServerLoadEvent } from "./$types";
import { logError } from '$lib/logger';
import { isAdmin } from '$lib/auth/helpers';

const log = debug("app:routes:(authenticated):layout");

export async function load(event: LayoutServerLoadEvent) {
    try {
        // Prefer server-provided user data sources only. Using server-side
        // values prevents client-side stores from causing stale UI to appear
        // authenticated when the server does not agree.
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
        } catch (err: any) {
            // If this is a redirect (thrown by redirect()), re-throw so SvelteKit
            // performs the redirect instead of us returning a fallback page.
            if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number' && err.status >= 300 && err.status < 400) {
                throw err;
            }
            const stack = err && err.stack ? err.stack : String(err);
            logError('[layout] load error', { stack });
            return { user: null, __fallbackError: 'Failed to load user session (see server logs)' };
        }
}
