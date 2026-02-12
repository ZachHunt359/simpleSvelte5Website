import { redirect } from "@sveltejs/kit";
import debug from "debug";
import type { LayoutServerLoadEvent } from "./$types";
import { logError } from '$lib/logger';
import { isAdmin } from '$lib/auth/helpers';

const log = debug("app:routes:(authenticated):layout");

export async function load(event: LayoutServerLoadEvent) {
    try {
        console.log('[authenticated layout] load called');
        // Use ONLY event.locals.user (set by hooks.server.ts)
        const user = event.locals?.user;
        console.log('[authenticated layout] user from event.locals:', user ? `${user.id}:${user.email}` : 'NULL');

        if (!user) {
            console.log('[authenticated layout] No user - redirecting to login');
            throw redirect(303, "/login");
        }

        const admin = await isAdmin(event.cookies);
        console.log('[authenticated layout] isAdmin result:', admin);
        console.log('[authenticated layout] Returning data:', { user: `${user.id}:${user.email}`, isAdmin: admin });
        return { user, isAdmin: admin };
        } catch (err: any) {
            console.log('[authenticated layout] CATCH BLOCK HIT - Error:', err);
            // If this is a redirect (thrown by redirect()), re-throw so SvelteKit
            // performs the redirect instead of us returning a fallback page.
            if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number' && err.status >= 300 && err.status < 400) {
                console.log('[authenticated layout] Re-throwing redirect with status:', err.status);
                throw err;
            }
            const stack = err && err.stack ? err.stack : String(err);
            console.log('[authenticated layout] Non-redirect error - returning fallback');
            logError('[layout] load error', { stack });
            return { user: null, __fallbackError: 'Failed to load user session (see server logs)' };
        }
}
