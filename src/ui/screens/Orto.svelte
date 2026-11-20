<script lang="ts">
  import type { Insights } from '../../app/insights'
  import type { JournalStore } from '../../app/journal.svelte'
  import { moonAt } from '../../core/moon/moon'
  import { loadNav, saveNav, type OrtoView } from '../../app/navState'
  import type { Crop, UserCrops } from '../../core/sowing/crops'
  import DiarioView from './DiarioView.svelte'
  import LavoriView from './LavoriView.svelte'
  import Semine from './Semine.svelte'
  import TabellaColture from './TabellaColture.svelte'

  let {
    insights,
    today,
    crops,
    userCrops,
    journal,
    place,
    minSeasons,
    onpatch,
    onreset,
    onadd,
    onremove,
  }: {
    insights: Insights
    today: string
    crops: Crop[]
    userCrops: UserCrops
    journal: JournalStore
    place: { lat: number; lon: number }
    minSeasons: number
    onpatch: (id: string, patch: Partial<Crop>) => void
    onreset: (id: string) => void
    onadd: (name: string, emoji: string) => void
    onremove: (id: string) => void
  } = $props()

  type View = OrtoView
  let view = $state<View>(loadNav().view)
  function show(v: View) {
    view = v
    saveNav({ view: v, scroll: 0 })
  }
  let editing = $state(false)
  const waxing = $derived(moonAt(today).waxing)
  const tabs: [View, string][] = [
    ['semine', '🌰 Semine'],
    ['lavori', '🧰 Lavori'],
    ['diario', '📖 Diario'],
  ]
</script>

{#if editing}
  <TabellaColture {crops} user={userCrops} {onpatch} {onreset} {onadd} {onremove} onclose={() => (editing = false)} />
{:else}
  <div class="seg" role="tablist">
    {#each tabs as [v, label]}
      <button role="tab" aria-selected={view === v} class:on={view === v} onclick={() => show(v)}>{label}</button>
    {/each}
  </div>

  {#key view}
    <div class="page">
      {#if view === 'semine'}
        <Semine {insights} {today} onedit={() => (editing = true)} />
      {:else if view === 'lavori'}
        <LavoriView {insights} {waxing} />
      {:else}
        <DiarioView {journal} {crops} {insights} {today} {place} {minSeasons} {onpatch} />
      {/if}
    </div>
  {/key}
{/if}

<style>
  .seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: var(--pesca); border-radius: 18px; padding: 4px; margin-bottom: 12px; }
  .seg button { font: inherit; font-size: 0.9rem; font-weight: 600; border: 0; border-radius: 14px; padding: 9px 4px; background: none; color: var(--testo); cursor: pointer; }
  .seg button.on { background: #fff; font-weight: 800; box-shadow: 0 1px 3px #0002; }
</style>
