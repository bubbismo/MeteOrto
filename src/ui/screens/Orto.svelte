<script lang="ts">
  import type { Insights } from '../../app/insights'
  import { moonAt } from '../../core/moon/moon'
  import { groupByCrop } from '../../core/sowing/sowing'
  import MoonCard from '../components/MoonCard.svelte'
  import SowingRow from '../components/SowingRow.svelte'
  import { deg } from '../format'

  let { insights, today, onedit }: { insights: Insights; today: string; onedit: () => void } = $props()

  const waxing = $derived(moonAt(today).waxing)
  const by = (s: string) => groupByCrop(insights.sowing.filter((a) => a.status === s))
  const ora = $derived(by('ora'))
  const attenzione = $derived(by('attenzione'))
  const rimanda = $derived(by('rimanda'))
  const presto = $derived(by('presto'))
</script>

<MoonCard {today} />

<section class="soil">
  <span>🌱</span>
  <div>
    <b>Terreno a 6 cm: {deg(insights.soil.past)}</b> negli ultimi 7 giorni
    <small>previsto {deg(insights.soil.next)} nei prossimi 5</small>
  </div>
</section>

{#if attenzione.length}
  <h2>⚠️ Periodo giusto, ma attenzione al gelo</h2>
  {#each attenzione as items}<SowingRow {items} {waxing} />{/each}
{/if}

<h2>✅ Da fare ora <span class="n">{ora.length}</span></h2>
{#each ora as items}<SowingRow {items} {waxing} />{:else}<p class="empty">Niente di consigliato in questo momento.</p>{/each}

{#if rimanda.length}
  <details>
    <summary>⏳ Meglio aspettare <span class="n">{rimanda.length}</span> · il terreno è ancora freddo</summary>
    {#each rimanda as items}<SowingRow {items} {waxing} />{/each}
  </details>
{/if}

{#if presto.length}
  <details>
    <summary>📅 Nelle prossime settimane <span class="n">{presto.length}</span></summary>
    {#each presto as items}<SowingRow {items} {waxing} />{/each}
  </details>
{/if}

<button class="edit" onclick={onedit}>✏️ Modifica la tabella delle colture</button>
<p class="note">I periodi sono finestre indicative per il Nord Italia: dentro la finestra decidono il terreno e le gelate previste.</p>

<style>
  .soil { display: flex; gap: 10px; align-items: center; background: #fff; border-radius: 20px; padding: 10px 14px; margin-bottom: 4px; font-size: 0.9rem; }
  .soil span { font-size: 1.8rem; }
  .soil small { display: block; opacity: 0.7; }
  h2 { font-size: 1rem; margin: 18px 4px 4px; }
  .n { background: var(--pesca); border-radius: 10px; padding: 0 8px; font-size: 0.8rem; margin-left: 4px; }
  .empty { opacity: 0.7; margin: 8px 4px; }
  details { margin-top: 14px; }
  summary { cursor: pointer; font-weight: 700; font-size: 0.95rem; margin: 0 4px; }
  .edit { width: 100%; margin-top: 18px; font: inherit; font-weight: 700; padding: 12px; border: 0; border-radius: 16px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  .note { font-size: 0.8rem; opacity: 0.7; margin: 10px 4px; }
</style>
