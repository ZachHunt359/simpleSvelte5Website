<script lang="ts">
	import type { ActionData } from './$types';
	export let form: ActionData;
</script>

<section class="max-w-md mx-auto my-8">
	<h1 class="text-3xl font-bold mb-6">Forgot Password</h1>
	
	{#if form?.success}
		<div class="alert alert-success mb-6">
			<p>{form.message}</p>
		</div>
		<a href="/login" class="btn btn-primary">Back to Login</a>
	{:else}
		<form method="POST" class="flex flex-col gap-4">
			{#if form?.error}
				<div class="alert alert-error">
					{form.error}
				</div>
			{/if}
			
			<p class="text-sm text-base-content/70">
				Enter your email address and we'll send you a link to reset your password.
			</p>
			
			<input
				type="email"
				name="email"
				placeholder="Email..."
				class="input input-bordered w-full"
				required
				value={form?.email ?? ''}
			/>
			
			<div class="flex gap-4">
				<button type="submit" class="btn btn-primary">Send Reset Link</button>
				<a href="/login" class="btn btn-ghost">Back to Login</a>
			</div>
		</form>
	{/if}
</section>