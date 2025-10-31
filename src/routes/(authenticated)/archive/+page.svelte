<script lang="ts">
  import { onMount } from 'svelte';
  export let data: any;

  let q = data.q || '';
  let page = data.page || 1;
  let perPage = data.perPage || 20;
  let total = data.total || 0;
  let archived: any[] = data.archived || [];
  // bulk delete default and handlers
  let bulkDays: number = 30;

  async function loadPage() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(page));
    params.set('perPage', String(perPage));
    const res = await fetch('/api/inquiry/archive?' + params.toString());
    if (!res.ok) {
      archived = [];
      total = 0;
      return;
    }
    const json = await res.json();
    archived = json.archived || [];
    page = json.page || page;
    perPage = json.perPage || perPage;
    total = json.total || 0;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  async function resend(id: number) {
    if (!confirm('Resend this archived reply?')) return;
    const res = await fetch('/api/inquiry/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (json.success) {
      alert('Resent — new messageId: ' + (json.messageId || ''));
      // update in-place: find and update the item
      const idx = archived.findIndex(x => x.id === id);
      if (idx !== -1) {
        archived[idx].messageId = json.messageId || archived[idx].messageId;
      }
    } else {
      alert('Resend failed: ' + (json.error || res.status));
    }
  }

  function goto(p:number) { page = p; loadPage(); }

  onMount(()=>{ loadPage(); });

  async function deleteOne(id:number) {
    if (!confirm('Delete this archived inquiry? This is irreversible.')) return;
    const res = await fetch('/api/inquiry/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (json.success) {
      archived = archived.filter(x => x.id !== id);
    } else {
      alert('Delete failed: ' + (json.error || res.status));
    }
  }

  async function deleteOlder() {
    if (!confirm(`Delete all archived inquiries older than ${bulkDays} days? This cannot be undone.`)) return;
    const res = await fetch('/api/inquiry/delete-old', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: bulkDays }) });
    const json = await res.json();
    if (json.success) {
      // reload current page
      loadPage();
      alert(`Deleted ${json.changes || 0} items.`);
    } else {
      alert('Bulk delete failed: ' + (json.error || res.status));
    }
  }
</script>

<section class="prose archive">
  <h1>Sent / Archive</h1>

  <div class="archive-controls" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;">
    <input placeholder="Search (email, reply text, message id)" bind:value={q} class="input input-bordered" />
    <button class="btn btn-primary" on:click={() => { const params=new URLSearchParams(location.search); params.set('q', q); params.set('page','1'); location.search = params.toString(); }}>Search</button>
    <div style="margin-left:auto;display:flex;gap:0.5rem;align-items:center;">
      <input type="number" min="1" bind:value={bulkDays} style="width:4.5rem;padding:0.25rem" />
      <button class="btn btn-warning" on:click={deleteOlder}>Delete all older than days</button>
    </div>
  </div>

  {#if !archived || archived.length === 0}
    <p>No sent inquiries yet.</p>
  {:else}
    <div class="archive-list">
      {#each archived as a}
        <div class="archive-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div><strong>Id:</strong> {a.id}</div>
            <div>
              <button class="btn btn-xs" on:click={() => copyToClipboard(a.messageId || '')}>Copy Message-ID</button>
              <button class="btn btn-xs" on:click={() => resend(a.id)} style="margin-left:0.5rem;">Resend</button>
              <button class="btn btn-error btn-xs" on:click={() => deleteOne(a.id)} style="margin-left:0.5rem;">Delete</button>
            </div>
          </div>
          <div><strong>Email:</strong> {a.email}</div>
          <div><strong>Reply:</strong> {a.reply}</div>
          <div><strong>Message-ID:</strong> <code>{a.messageId}</code></div>
          <div><strong>Reply at:</strong> {a.replyTimestamp ? new Date(a.replyTimestamp * 1000).toLocaleString() : '—'}</div>
        </div>
      {/each}
    </div>

    <div class="pagination" style="margin-top:1rem;display:flex;gap:0.5rem;align-items:center;">
      <button class="btn btn-sm" on:click={() => goto(Math.max(1, page-1))} disabled={page<=1}>Prev</button>
  <div>Page {page} — showing {archived.length} of {total}</div>
      <button class="btn btn-sm" on:click={() => goto(page+1)} disabled={page*perPage >= total}>Next</button>
    </div>
  {/if}
</section>


<style>
.archive { max-width: 70%; margin: auto; }
.archive-list { display:flex; flex-direction: column; gap: 1rem; }
.archive-card { background:#111; border:2px solid #444; padding:1rem; border-radius:0.5rem; color:#ddd }
.archive-controls input { width: 40rem }
</style>
