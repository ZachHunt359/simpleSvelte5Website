<script lang="ts">
  export let data: any;
  let email = '';
  let password = '';
  let code = data?.code ?? '';
</script>

<section class="max-w-md mx-auto p-4">
  <h1>Register (admin invite)</h1>

  {#if (data as any)?.error}
    <p class="text-red-600">{(data as any).error}</p>
  {/if}

  <form method="post">
    <input type="hidden" name="code" value={code} />
    <div>
      <label for="email">Email</label>
      <input id="email" type="email" name="email" bind:value={email} required />
    </div>

    <div>
      <label for="password">Password</label>
      <input id="password" type="password" name="password" bind:value={password} required minlength="8" />
    </div>

    <button type="submit">Create account</button>
  </form>
</section>