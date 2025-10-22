import { auth } from "$lib/auth";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { AUTH_TOKEN_EXPIRY_SECONDS } from "$lib/constants.server";

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = (form.get("email") as string || "").trim();
		const password = (form.get("password") as string || "").trim();
		const password_confirm = (form.get("password-confirm") as string || "").trim();

		if (!email)
			return fail(422, { email, error: "An email address is required." });
		if (!password)
			return fail(422, { email, error: "A password is required." });
		if (password.length < 8)
			return fail(422, {
				email,
				error: "Password must be at least 8 characters long.",
			});
		if (password.length > 32)
			return fail(422, {
				email,
				error: "Password cannot be more than 32 characters long.",
			});
		if (password !== password_confirm)
			return fail(422, {
				email,
				error: "Your passwords must match.",
			});

		const signup_resp = await auth.signup({
			email,
			password,
			password_confirm,
			opts: { cookies: event.cookies },
		});

		if (signup_resp.isErr()) {
			const error = (
				String(signup_resp.error) ??
				"There was an issue creating your account. Please try again."
			).trim();
			return fail(500, { email, error });
		}

		// Sign the user in immediately
		const login_resp = await auth.login({
			email,
			password,
			opts: { cookies: event.cookies },
		});

		if (login_resp.isErr()) {
			const error = (
				String(login_resp.error) ?? "Could not sign you in. Please try again."
			).trim();
			return fail(500, { email, error });
		}

		const user = login_resp.value;
		if (user?.id && user?.token) {
			// TODO: duplicated in login page
			event.cookies.set("auth_token", `${user.id}:${user.token}`, {
				path: "/",
				maxAge: AUTH_TOKEN_EXPIRY_SECONDS,
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production'
			});
		}

		delete user.token;

		// success: auth.login set the cookie; redirect to dashboard
		throw redirect(303, "/dashboard");
	},
};
