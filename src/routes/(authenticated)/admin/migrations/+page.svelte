<script lang="ts">
  export let data;
  const migrations: { name: string; appliedAt: number | null }[] = data.migrations ?? [];
  function fmt(ts: number | null) {
    if (!ts) return 'not applied';
    try { return new Date(ts * 1000).toISOString(); } catch (e) { return String(ts); }
  }
</script>

<h1>Migrations Status</h1>

{#if migrations.length === 0}
  <p>No migration files found.</p>
{:else}
  <table>
    <thead>
      <tr><th>Migration</th><th>Applied At</th></tr>
    </thead>
    <tbody>
      {#each migrations as m}
        <tr>
          <td>{m.name}</td>
          <td>{fmt(m.appliedAt)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
