import { auth } from "$lib/auth";
import { AUTH_TOKEN_EXPIRY_SECONDS } from "$lib/constants.server";
import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import debug from "debug";
import { getUserFromCookies } from "$lib/auth/helpers";

const log = debug("app:routes:login:page.server");

export const load: PageServerLoad = async ({ cookies }) => {
    // Don't redirect here - let the user access the login page even if logged in
    // The form action will handle the redirect after successful login
    return { title: "Log In" };
};

export const actions: Actions = {
    async default(event) {
        const data = await event.request.formData();
        const email = data.get("email") as string;
        const password = data.get("password") as string;

        const resp = await auth.login({
            email,
            password,
            opts: { cookies: event.cookies },
        });

        if (resp.isErr()) {
            const error = (
                String(resp.error) ??
                "No account with that email or username could be found."
            ).trim();
            return fail(401, { email, error });
        }

        const user = resp.value;

        log("user:", user);

        // auth.login already sets the auth cookie (server-side). No manual cookie set here.
        // Redirect to dashboard after login  
        throw redirect(303, "/dashboard");
    },
};
