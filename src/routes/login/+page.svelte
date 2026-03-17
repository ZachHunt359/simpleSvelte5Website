<script lang="ts">
	import { faWarning, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
	import debug from "debug";
	import Fa from "svelte-fa";
	import type { ActionData, PageData } from "./$types";

	const log = debug("app:routes:login:page.svelte");

	export let form: ActionData;
	export let data: PageData;

	$: log("form:", form);
</script>

<section class="max-w-sm mx-auto">
	<form
		class="flex flex-col gap-6 my-6"
		method="POST"
		data-sveltekit-reload
	>
		{#if data?.resetSuccess}
			<div class="alert alert-success">
				<div>
					<Fa icon={faCheckCircle} />
					Your password has been reset successfully! Please log in with your new password.
				</div>
			</div>
		{/if}
		{#if form?.error}
			<div class="alert alert-error">
				<div>
					<Fa icon={faWarning} />
					{form.error}
				</div>
			</div>
		{/if}
		<p>
			<input
				autocomplete="email"
				autocorrect="off"
				type="email"
				name="email"
				placeholder="Email..."
				class="input input-bordered w-full"
				required
				value={form?.email ?? ""}
			/>
		</p>
		<p>
			<input
				autocomplete="current-password"
				type="password"
				name="password"
				placeholder="Password..."
				class="input input-bordered w-full"
				required
			/>
		</p>
		<p class="flex items-center gap-6 mt-6">
			<button class="btn btn-primary">Log In</button>
		</p>
		<p class="text-center text-sm">
			<a href="/forgot-password" class="link">Forgot your password?</a>
		</p>
	</form>

	{#if form}
		<section class="my-12 prose">
			<h3>Form data:</h3>
			<pre>{JSON.stringify(form, null, 2)}</pre>
		</section>
	{/if}
</section>
