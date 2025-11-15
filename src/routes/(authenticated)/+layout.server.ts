import { redirect } from "@sveltejs/kit";
import debug from "debug";
import type { LayoutServerLoadEvent } from "./$types";
import { logError } from '$lib/logger';
import { isAdmin } from '$lib/auth/helpers';

const log = debug("app:routes:(authenticated):layout");

export async function load(event: LayoutServerLoadEvent) {
    try {
        // Use ONLY event.locals.user (set by hooks.server.ts)
        const user = event.locals?.user;

        if (!user) {
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
