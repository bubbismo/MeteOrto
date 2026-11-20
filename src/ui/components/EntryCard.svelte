<script lang="ts">
  import { explainOutcome } from '../../core/journal/entry'
  import type { JournalEntry } from '../../core/journal/types'
  import { summarizeWeather } from '../../core/journal/weather'
  import { METHODS, type Crop } from '../../core/sowing/crops'
  import { deg, fullDate, mm } from '../format'
  import { METHOD_LABEL } from '../sowingText'
  import StarRating from './StarRating.svelte'

  let {
    e,
    crop,
    today,
    onupdate,
    onremove,
  }: { e: JournalEntry; crop: Crop | undefined; today: string; onupdate: (patch: Partial<JournalEntry>) => void; onremove: () => void } = $props()

  let open = $state(false)
  let rating = $state(false)

  const w = $derived(summarizeWeather(e.weather))
  const why = $derived(w ? explainOutcome(w, e.quality, crop?.soilTempMin ?? 10) : [])
  const WHY = {
    'suolo-freddo': 'terreno freddo nei primi giorni',
    gelate: 'gelate nei primi giorni',
    'molta-pioggia': 'molta pioggia',
    siccita: 'quasi niente pioggia',
    'condizioni-buone': 'terreno tiepido e nessuna gelata',
  } as const
  const harvested = $derived(e.quality !== undefined || !!e.harvestFrom)

  function harvestNow(q: 1 | 2 | 3 | 4 | 5) {
    onupdate({ quality: q, harvestFrom: e.harvestFrom ?? today, harvestTo: e.harvestTo ?? today })
    rating = false
  }
  const dateInput = (v: string) => (v ? v : undefined)
</script>

<article>
  <div class="row">
    <span class="emoji">{e.emoji}</span>
    <div class="main">
      <b>{e.cropName}</b> <span class="meta">{METHOD_LABEL[e.method]} · {fullDate(e.sownOn)}</span>
      {#if w}
        <div class="chips">
          <span>🌱 terreno {deg(w.soilMean)}</span>
          <span class:cold={w.frostNights > 0}>🌡️ min {deg(w.tMinAbs)}{w.frostNights ? ` · ${w.frostNights} gelate` : ''}</span>
          <span>🌧️ {mm(w.rain)} mm</span>
        </div>
        <small>nei primi {w.days} giorni</small>
      {:else if e.sownOn === today}
        <div class="meta">Il meteo dei prossimi giorni si salva da solo.</div>
      {:else}
        <div class="meta">Scarico il meteo di quei giorni…</div>
      {/if}
      {#if e.quality !== undefined}
        <div class="harv">🧺 Raccolto: <span class="starline">{'★'.repeat(e.quality)}{'☆'.repeat(5 - e.quality)}</span></div>
        {#if why.length}<small class="why">Forse perché: {why.map((c) => WHY[c]).join(', ')}</small>{/if}
      {/if}
    </div>
  </div>

  <div class="actions">
    {#if !harvested && !rating}
      <button class="quick" onclick={() => (rating = true)}>🧺 Raccolto</button>
    {/if}
    {#if rating}
      <span class="ask">Com’è andata?</span>
      <StarRating onchange={harvestNow} />
    {/if}
    <button onclick={() => (open = !open)}>{open ? 'Chiudi' : 'Modifica'}</button>
  </div>

  {#if open}
    <div class="edit">
      <label>Data di semina
        <input type="date" value={e.sownOn} max={today} onchange={(ev) => ev.currentTarget.value && onupdate({ sownOn: ev.currentTarget.value })} />
      </label>
      <label>Tecnica
        <select value={e.method} onchange={(ev) => onupdate({ method: ev.currentTarget.value as JournalEntry['method'] })}>
          {#each METHODS as m}<option value={m}>{METHOD_LABEL[m]}</option>{/each}
        </select>
      </label>
      <label>Raccolto dal
        <input type="date" value={e.harvestFrom ?? ''} min={e.sownOn} onchange={(ev) => onupdate({ harvestFrom: dateInput(ev.currentTarget.value) })} />
      </label>
      <label>al
        <input type="date" value={e.harvestTo ?? ''} min={e.harvestFrom ?? e.sownOn} onchange={(ev) => onupdate({ harvestTo: dateInput(ev.currentTarget.value) })} />
      </label>
      <div class="full">Qualità del raccolto
        <div><StarRating value={e.quality} onchange={(q) => onupdate({ quality: q })} /></div>
      </div>
      <label class="full">Note
        <textarea rows="2" value={e.notes ?? ''} onchange={(ev) => onupdate({ notes: ev.currentTarget.value || undefined })} placeholder="Varietà, cosa è andato bene o male…"></textarea>
      </label>
      <button class="danger" onclick={() => confirm('Eliminare questa voce dal diario?') && onremove()}>Elimina voce</button>
    </div>
  {:else if e.notes}
    <p class="notes">📝 {e.notes}</p>
  {/if}
</article>

<style>
  article { background: #fff; border-radius: 20px; padding: 10px 14px 12px; margin-top: 8px; }
  .row { display: flex; gap: 10px; }
  .emoji { font-size: 2rem; }
  .main { flex: 1; }
  .meta { font-size: 0.8rem; opacity: 0.75; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.82rem; margin-top: 4px; }
  .chips .cold { color: #0277bd; font-weight: 700; }
  small { opacity: 0.65; font-size: 0.72rem; }
  .harv { margin-top: 6px; font-size: 0.9rem; }
  .starline { color: #ff9f1c; letter-spacing: 1px; }
  .why { display: block; }
  .actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  .ask { font-size: 0.85rem; }
  button { font: inherit; font-size: 0.85rem; font-weight: 700; padding: 6px 12px; border: 0; border-radius: 12px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  .quick { background: #fff3cd; }
  .edit { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  label, .full { display: grid; gap: 3px; font-size: 0.78rem; }
  .full { grid-column: 1 / -1; }
  input, select, textarea { font: inherit; padding: 7px 9px; border: 2px solid var(--pesca); border-radius: 12px; background: #fff; color: inherit; min-width: 0; }
  textarea { resize: vertical; }
  .danger { background: #fde0dc; grid-column: 1 / -1; }
  .notes { margin: 8px 0 0; font-size: 0.85rem; opacity: 0.85; }
</style>
