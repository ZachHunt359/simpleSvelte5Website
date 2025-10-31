<script lang="ts">
  export let data: any;
  let email = '';
  let status: string | null = null;
  async function sendInvite(e: Event) {
    e.preventDefault();
    status = 'sending...';
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      credentials: 'same-origin', // send auth cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const body = await res.json();
    if (res.ok) {
      status = `Invite sent`;
      email = '';
      await refreshInvites();
    } else {
      status = body?.error ?? 'error';
    }
  }

  function prettyEpoch(ts: number | null | undefined) {
    if (!ts) return '-';
    try {
      return new Date(ts * 1000).toLocaleString();
    } catch (e) {
      return String(ts);
    }
  }

  async function refreshInvites() {
    try {
      const res = await fetch('/api/admin/invites', { credentials: 'same-origin' });
      if (!res.ok) return;
      const body = await res.json();
      data.invites = body.invites ?? [];
    } catch (e) {
      // ignore
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      status = 'Copied code to clipboard';
      setTimeout(() => (status = null), 2000);
    } catch (e) {
      status = 'Copy failed';
      setTimeout(() => (status = null), 2000);
    }
  }

  async function deleteInvite(code: string) {
    if (!confirm('Delete invite ' + code + '?')) return;
    try {
      const res = await fetch('/api/admin/invite/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const body = await res.json();
      if (res.ok) {
        status = 'Deleted';
        await refreshInvites();
      } else {
        status = body?.error ?? 'Delete failed';
      }
    } catch (e) {
      status = 'Delete failed';
    }
    setTimeout(() => (status = null), 2000);
  }
</script>

<section class="max-w-md mx-auto p-4">
  <h2>Send Admin Invite</h2>
  <form on:submit|preventDefault={sendInvite}>
    <input type="email" bind:value={email} placeholder="email@example.com" required />
    <button type="submit">Send Invite</button>
  </form>
  {#if status}
    <p>{status}</p>
  {/if}

  <h3 style="margin-top:1.25rem">Existing invite codes</h3>
  {#if data?.invites?.length}
    <table class="invites-table">
      <thead>
        <tr><th>Code</th><th>Used</th><th>Created</th><th>UseBy</th><th>UsedAt</th><th>Admin</th><th></th></tr>
      </thead>
      <tbody>
        {#each data.invites as inv, i}
          <tr class={i % 2 === 0 ? 'even' : 'odd'}>
            <td>
              <div class="code-cell">
                <code>{inv.Code}</code>
                <button class="copy-btn" type="button" on:click={() => copyCode(inv.Code)} aria-label="Copy code">📋</button>
              </div>
            </td>
            <td>{inv.Used ? 'Yes' : 'No'}</td>
            <td>{prettyEpoch(inv.CreatedAt)}</td>
            <td>{prettyEpoch(inv.UseBy)}</td>
            <td>{prettyEpoch(inv.UsedAt)}</td>
            <td>{inv.AdminEmail ?? '-'}</td>
            <td>
              <button class="delete-btn" type="button" on:click={() => deleteInvite(inv.Code)} aria-label="Delete invite">🗑️</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <style>
      /* Dark theme table styling to match admin area */
      .invites-table{border-collapse:collapse;margin-top:0.5rem;width:100%; color:#e6e6e6; background:transparent}
      .invites-table th,.invites-table td{border:1px solid #333; padding:0.5rem 0.65rem; text-align:left}
      .invites-table thead th{background:#222; color:#f3f4f6; font-weight:600}
      .invites-table tr.even{background:#121212}
      .invites-table tr.odd{background:#0d0d0d}
      .invites-table tbody tr:hover{background:#1a1a1a}

      .code-cell{display:flex;align-items:center;gap:0.5rem}
      .code-cell code{background:#0f0f0f; color:#cbd5e1; padding:0.15rem 0.35rem; border:1px solid #2a2a2a; border-radius:4px}

      .copy-btn{background:transparent; color:#cbd5e1; border:0; cursor:pointer; padding:0.2rem 0.35rem; border-radius:4px}
      .copy-btn:hover{background:#2a2a2a}

      .delete-btn{background:transparent; color:#fca5a5; border:0; cursor:pointer; padding:0.2rem 0.35rem; border-radius:4px}
      .delete-btn:hover{background:#3a1f1f}
    </style>
  {:else}
    <p>No invites yet.</p>
  {/if}
</section>