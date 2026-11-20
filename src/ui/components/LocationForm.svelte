<script lang="ts">
  import { untrack } from 'svelte'
  import { fetchElevation } from '../../adapters/openmeteo/elevation'
  import { parseLocation } from '../../core/location/parse'
  import type { Location } from '../../core/types'

  let { onsave, initial = '' }: { onsave: (loc: Location) => void; initial?: string } = $props()

  let text = $state(untrack(() => initial))
  let error = $state('')
  let busy = $state(false)

  const errors = {
    empty: 'Incolla le coordinate o il link di Google Maps.',
    invalid: 'Non riesco a leggere le coordinate. Esempio: 44.68630, 9.85680',
    'out-of-range': 'Coordinate fuori dai valori possibili.',
    'short-link': 'Link breve non supportato: apri il link, tieni premuto sul punto e copia le coordinate.',
  } as const

  async function submit(e: Event) {
    e.preventDefault()
    const r = parseLocation(text)
    if (!r.ok) {
      error = errors[r.reason]
      return
    }
    error = ''
    busy = true
    const elevation = await fetchElevation(r.lat, r.lon)
    busy = false
    onsave({ lat: r.lat, lon: r.lon, elevation })
  }
</script>

<form onsubmit={submit}>
  <label for="coords">Dove si trova il tuo orto?</label>
  <p class="hint">In Google Maps tieni premuto sul punto e copia le coordinate (es. <b>44.68630, 9.85680</b>), oppure incolla il link.</p>
  <textarea id="coords" rows="3" bind:value={text} placeholder="44.68630, 9.85680" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <button type="submit" disabled={busy}>{busy ? 'Cerco l’altitudine…' : 'Conferma posizione'}</button>
</form>

<style>
  form { display: grid; gap: 12px; }
  label { font-weight: 700; font-size: 1.15rem; }
  .hint { margin: 0; font-size: 0.9rem; opacity: 0.8; }
  textarea { width: 100%; font: inherit; font-size: 1rem; padding: 12px; border: 2px solid var(--pesca); border-radius: 16px; background: #fff; color: inherit; resize: none; }
  textarea:focus { outline: none; border-color: var(--sole); }
  button { font: inherit; font-weight: 700; padding: 14px; border: 0; border-radius: 16px; background: var(--sole); color: var(--testo); cursor: pointer; }
  button:disabled { opacity: 0.6; }
  .error { color: #b3261e; margin: 0; font-size: 0.9rem; }
</style>
