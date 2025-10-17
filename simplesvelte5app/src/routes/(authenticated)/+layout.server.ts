import { session } from "$lib/stores/session";
import { redirect } from "@sveltejs/kit";
import debug from "debug";
import { get } from "svelte/store";
import type { LayoutServerLoadEvent } from "./$types";
import { logError } from '$lib/logger';
import { isAdmin } from '$lib/auth/helpers';

const log = debug("app:routes:(authenticated):layout");

export async function load(event: LayoutServerLoadEvent) {
    try {
        const parent_user = (await event.parent())?.user;
        const locals_user = event.locals?.user;
        const session_user = get(session)?.user;

        log("parent_user:", parent_user);
        log("locals_user:", locals_user);
        log("session_user:", session_user);

        const user = session_user || locals_user || parent_user;

        log("user:", user);

        if (!user) {
            log("no user, redirecting to /login");
            throw redirect(301, "/login");
        }
        const admin = await isAdmin(event.cookies);
        return { user, isAdmin: admin };
    } catch (err: any) {
        // non-fatal: log and return safe fallback so UI can show a warning instead of crashing
        const stack = err && err.stack ? err.stack : String(err);
        logError('[layout] load error', { stack });
        return { user: null, __fallbackError: 'Failed to load user session (see server logs)' };
    }
}
