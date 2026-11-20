<script lang="ts">
  import type { Crop } from '../../core/sowing/crops'

  let { crops, ready, recent, onpick, onclose }: { crops: Crop[]; ready: Set<string>; recent: string[]; onpick: (c: Crop) => void; onclose: () => void } = $props()

  let q = $state('')
  // crops that can be sown now first, then those used recently, then the rest
  const ordered = $derived(
    [...crops]
      .map((c) => ({ c, rank: ready.has(c.id) ? 0 : recent.includes(c.id) ? 1 : 2 }))
      .sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name, 'it'))
      .map((x) => x.c)
      .filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())),
  )
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Cosa hai seminato?">
  <div class="sheet">
    <header>
      <b>Cosa hai seminato oggi?</b>
      <button class="close" onclick={onclose} aria-label="Chiudi">✕</button>
    </header>
    <input bind:value={q} placeholder="🔎 Cerca" />
    <div class="grid">
      {#each ordered as c (c.id)}
        <button class="tile" class:now={ready.has(c.id)} onclick={() => onpick(c)}>
          <span>{c.emoji}</span>{c.name}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: #0006; z-index: 10; display: flex; align-items: flex-end; justify-content: center; }
  .sheet { background: var(--crema); width: 100%; max-width: 560px; max-height: 82dvh; border-radius: 28px 28px 0 0; padding: 14px 14px calc(14px + env(safe-area-inset-bottom)); display: grid; grid-template-rows: auto auto 1fr; gap: 10px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .close { background: none; border: 0; font-size: 1.3rem; cursor: pointer; color: inherit; }
  input { font: inherit; padding: 10px 12px; border: 2px solid var(--pesca); border-radius: 14px; background: #fff; color: inherit; }
  .grid { overflow-y: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-content: start; }
  .tile { font: inherit; font-size: 0.8rem; display: grid; justify-items: center; gap: 2px; padding: 10px 4px; border: 2px solid transparent; border-radius: 16px; background: #fff; color: inherit; cursor: pointer; }
  .tile span { font-size: 1.9rem; }
  .tile.now { border-color: var(--foglia); }
</style>
