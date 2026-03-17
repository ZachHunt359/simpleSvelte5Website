<script lang="ts">
	import type { ActionData, PageData } from './$types';
	export let data: PageData;
	export let form: ActionData;
</script>

<section class="max-w-md mx-auto my-8">
	<h1 class="text-3xl font-bold mb-6">Reset Password</h1>
	
	{#if data.error || form?.tokenError}
		<div class="alert alert-error mb-6">
			<p>{data.error || form?.tokenError}</p>
		</div>
		<a href="/forgot-password" class="btn btn-primary">Request New Reset Link</a>
	{:else if data.valid}
		<form method="POST" class="flex flex-col gap-4">
			<input type="hidden" name="token" value={data.token} />
			
			{#if form?.error}
				<div class="alert alert-error">
					{form.error}
				</div>
			{/if}
			
			<p class="text-sm text-base-content/70">
				Enter your new password below.
			</p>
			
			<input
				type="password"
				name="password"
				placeholder="New Password..."
				class="input input-bordered w-full"
				required
				minlength="8"
				autocomplete="new-password"
			/>
			
			<input
				type="password"
				name="password_confirm"
				placeholder="Confirm New Password..."
				class="input input-bordered w-full"
				required
				minlength="8"
				autocomplete="new-password"
			/>
			
			<button type="submit" class="btn btn-primary">Reset Password</button>
		</form>
	{/if}
</section>