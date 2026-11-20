<script lang="ts">
  import type { JournalStore } from '../../app/journal.svelte'
  import type { Insights } from '../../app/insights'
  import { suggestChanges, applySuggestion, type Suggestion } from '../../core/journal/adapt'
  import { defaultMethod, newEntry } from '../../core/journal/entry'
  import type { Crop } from '../../core/sowing/crops'
  import CropPicker from '../components/CropPicker.svelte'
  import EntryCard from '../components/EntryCard.svelte'
  import SuggestionCard from '../components/SuggestionCard.svelte'
  import { METHOD_LABEL } from '../sowingText'

  let {
    journal,
    crops,
    insights,
    today,
    place,
    minSeasons,
    onpatch,
  }: {
    journal: JournalStore
    crops: Crop[]
    insights: Insights
    today: string
    place: { lat: number; lon: number }
    minSeasons: number
    onpatch: (id: string, patch: Partial<Crop>) => void
  } = $props()

  let picking = $state(false)
  let toast = $state<{ id: string; text: string } | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  const ready = $derived(new Set(insights.sowing.filter((a) => a.status === 'ora').map((a) => a.crop.id)))
  const recent = $derived([...new Set(journal.entries.slice(0, 12).map((e) => e.cropId))])
  const suggestions = $derived(suggestChanges(journal.entries, crops, { minSeasons }).filter((s) => !journal.dismissed.includes(s.key)))
  const years = $derived([...new Set(journal.entries.map((e) => e.sownOn.slice(0, 4)))])
  const cropOf = (id: string) => crops.find((c) => c.id === id)

  // Two taps from the field: "＋ Ho seminato" then the crop. Date is today, technique is the one of the season.
  function pick(c: Crop) {
    const method = defaultMethod(c, today)
    const e = newEntry(c, method, today, place)
    journal.add(e)
    picking = false
    toast = { id: e.id, text: `${c.emoji} ${c.name} segnato · ${METHOD_LABEL[method].toLowerCase()} di oggi` }
    clearTimeout(timer)
    timer = setTimeout(() => (toast = null), 9000)
  }
  function undo() {
    if (toast) journal.remove(toast.id)
    toast = null
  }
  function apply(s: Suggestion) {
    const c = cropOf(s.cropId)
    if (c) onpatch(c.id, { periods: applySuggestion(c, s) })
  }
</script>

<button class="add" onclick={() => (picking = true)}>＋ Ho seminato</button>

{#if toast}
  <div class="toast" role="status">
    <span>✅ {toast.text}</span>
    <button onclick={undo}>Annulla</button>
  </div>
{/if}

{#if suggestions.length}
  <h2>💡 Dalla tua esperienza</h2>
  {#each suggestions as s (s.key)}
    {@const c = cropOf(s.cropId)}
    {#if c}<SuggestionCard {s} name={c.name} emoji={c.emoji} onapply={() => apply(s)} ondismiss={() => journal.dismiss(s.key)} />{/if}
  {/each}
{/if}

{#if journal.entries.length === 0}
  <section class="empty">
    <p><b>Il diario è vuoto.</b></p>
    <p>Quando semini o trapianti, tocca <b>＋ Ho seminato</b> e scegli la coltura: bastano due tocchi.</p>
    <p>Per ogni semina l’app salva da sola il meteo dei 30 giorni successivi (terreno, minime, gelate, pioggia), così capisci perché è andata bene o male.</p>
  </section>
{:else}
  {#each years as y}
    <h2>{y}</h2>
    {#each journal.entries.filter((e) => e.sownOn.startsWith(y)) as e (e.id)}
      <EntryCard {e} crop={cropOf(e.cropId)} {today} onupdate={(p) => journal.update(e.id, p)} onremove={() => journal.remove(e.id)} />
    {/each}
  {/each}
{/if}

<p class="note">
  Il diario propone di cambiare la tabella solo quando almeno <b>{minSeasons} stagioni diverse</b> confermano lo stesso risultato. Esporta e importa i dati da <b>Impostazioni</b>.
</p>

{#if picking}
  <CropPicker {crops} {ready} {recent} onpick={pick} onclose={() => (picking = false)} />
{/if}

<style>
  .add { width: 100%; font: inherit; font-size: 1.15rem; font-weight: 800; padding: 16px; border: 0; border-radius: 22px; background: var(--foglia); color: #fff; cursor: pointer; box-shadow: 0 4px 0 #3c8a40; }
  .add:active { transform: translateY(2px); box-shadow: 0 2px 0 #3c8a40; }
  .toast { animation: rise 0.45s var(--ease) both; display: flex; justify-content: space-between; align-items: center; gap: 8px; background: #263238; color: #fff; border-radius: 16px; padding: 10px 14px; margin-top: 10px; font-size: 0.9rem; }
  .toast button { font: inherit; font-weight: 700; background: #ffffff22; color: #fff; border: 0; border-radius: 10px; padding: 5px 12px; cursor: pointer; }
  h2 { font-size: 1rem; margin: 18px 4px 0; }
  .empty { background: #fff; border-radius: 22px; padding: 6px 16px; margin-top: 12px; font-size: 0.9rem; }
  .note { font-size: 0.8rem; opacity: 0.7; margin: 14px 4px; }
</style>
