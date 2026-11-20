<script lang="ts">
  import { untrack } from 'svelte'
  import { fetchElevation } from '../../adapters/openmeteo/elevation'
  import { searchPlaces, type Place } from '../../adapters/openmeteo/geocoding'
  import { parseLocation } from '../../core/location/parse'
  import type { Location } from '../../core/types'
  import MapPicker, { type Point } from './MapPicker.svelte'

  let { onsave, initial = null }: { onsave: (loc: Location) => void; initial?: Location | null } = $props()

  let point = $state<Point | null>(untrack(() => (initial ? { lat: initial.lat, lon: initial.lon } : null)))
  let query = $state('')
  let results = $state<Place[]>([])
  let pasted = $state('')
  let message = $state('')
  let busy = $state(false)

  const pasteErrors = {
    empty: 'Incolla le coordinate o il link di Google Maps.',
    invalid: 'Non riesco a leggere le coordinate. Esempio: 44.68630, 9.85680',
    'out-of-range': 'Coordinate fuori dai valori possibili.',
    'short-link': 'Link breve non supportato: apri il link, tieni premuto sul punto e copia le coordinate.',
  } as const

  function pick(p: Point) {
    point = p
    message = ''
  }

  function useGps() {
    message = ''
    if (!navigator.geolocation) {
      message = 'Il GPS non è disponibile su questo dispositivo.'
      return
    }
    busy = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        busy = false
        pick({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      () => {
        busy = false
        message = 'Non riesco a ottenere la posizione: controlla i permessi del browser.'
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function search(e: Event) {
    e.preventDefault()
    message = ''
    try {
      results = await searchPlaces(query)
      if (results.length === 0) message = 'Nessuna località trovata.'
    } catch {
      message = 'Ricerca non riuscita. Controlla la connessione.'
    }
  }

  function choose(p: Place) {
    results = []
    query = p.label
    pick({ lat: p.lat, lon: p.lon })
  }

  function usePasted() {
    const r = parseLocation(pasted)
    if (!r.ok) message = pasteErrors[r.reason]
    else pick({ lat: r.lat, lon: r.lon })
  }

  async function confirm() {
    if (!point) return
    busy = true
    const elevation = await fetchElevation(point.lat, point.lon)
    busy = false
    onsave({ lat: point.lat, lon: point.lon, elevation })
  }
</script>

<div class="form">
  <p class="title">Dove si trova il tuo orto?</p>

  <button type="button" class="gps" onclick={useGps} disabled={busy}>📍 Usa la mia posizione</button>

  <form class="search" onsubmit={search}>
    <input bind:value={query} placeholder="🔎 Cerca un paese o una località" autocomplete="off" />
    <button type="submit">Cerca</button>
  </form>
  {#if results.length}
    <ul>
      {#each results as r}
        <li><button type="button" onclick={() => choose(r)}>{r.label}</button></li>
      {/each}
    </ul>
  {/if}

  <MapPicker {point} onpick={pick} />
  <p class="hint">Tocca la mappa o trascina il segnaposto per indicare il punto esatto. Con “Satellite” riconosci l’orto dall’alto.</p>

  <details>
    <summary>Ho già le coordinate o un link di Google Maps</summary>
    <div class="paste">
      <textarea rows="2" bind:value={pasted} placeholder="44.68630, 9.85680" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
      <button type="button" onclick={usePasted}>Usa</button>
    </div>
  </details>

  {#if message}<p class="error" role="alert">{message}</p>{/if}
  {#if point}<p class="coords">{point.lat.toFixed(5)}, {point.lon.toFixed(5)}</p>{/if}

  <button type="button" class="confirm" onclick={confirm} disabled={!point || busy}>
    {busy ? 'Un momento…' : 'Conferma posizione'}
  </button>
</div>

<style>
  .form { display: grid; gap: 12px; width: 100%; }
  .title { font-weight: 700; font-size: 1.15rem; margin: 0; }
  button { font: inherit; font-weight: 700; padding: 12px; border: 0; border-radius: 16px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  button:disabled { opacity: 0.6; }
  .gps { background: var(--cielo); }
  .confirm { background: var(--sole); padding: 14px; }
  .search { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  input, textarea { font: inherit; padding: 12px; border: 2px solid var(--pesca); border-radius: 16px; background: #fff; color: inherit; min-width: 0; }
  input:focus, textarea:focus { outline: none; border-color: var(--sole); }
  textarea { resize: none; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  li button { width: 100%; text-align: left; font-weight: 400; background: #fff; }
  .hint { margin: 0; font-size: 0.85rem; opacity: 0.75; }
  summary { cursor: pointer; font-size: 0.9rem; }
  .paste { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 8px; }
  .error { color: #b3261e; margin: 0; font-size: 0.9rem; }
  .coords { margin: 0; text-align: center; font-size: 0.85rem; opacity: 0.7; }
</style>
