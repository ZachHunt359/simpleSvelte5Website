<script lang="ts">
  export let data: any;
</script>

<nav class="topnav">
  <div class="logo">PARANOiD Admin</div>
  <div class="navlinks">
    <a href="/dashboard">Inquiries</a>
    <a href="/archive">Archive</a>
    <a href="/upload">Upload</a>
    {#if data.isAdmin}
      <a href="/admin/logs">Logs</a>
      <a href="/admin/invite">Invite</a>
    {/if}
  </div>
  <div class="user">
    {#if data.user?.email}
      <span class="username">{data.user.email}</span>
      <form method="POST" action="?/logout" style="display:inline;margin-left:0.5rem;">
        <button class="btn btn-error btn-sm" type="submit">Logout</button>
      </form>
    {/if}
  </div>
</nav>

<main>
  <slot />
</main>

<style>
  .topnav{display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:#0b0b0b;color:#fff}
  .navlinks a{margin-right:1rem;color:#ddd;text-decoration:none}
  .logo{font-weight:bold}
  main{padding:1rem}
</style>

