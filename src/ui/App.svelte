<script lang="ts">
  import type { DayHistory } from '../adapters/openmeteo/archive'
  import { loadLocation, loadProxyUrl, loadSoil, saveLocation, saveSoil } from '../adapters/storage/kv'
  import { loadForecast, type ForecastResult } from '../app/forecastService'
  import { loadHorizon } from '../app/horizonService'
  import { loadClimate, loadHistory, type Climate } from '../app/historyService'
  import { computeInsights } from '../app/insights'
  import type { SoilType } from '../core/irrigation/irrigation'
  import type { HorizonProfile, Location } from '../core/types'
  import LocationForm from './components/LocationForm.svelte'
  import { ageLabel } from './format'
  import Giorni from './screens/Giorni.svelte'
  import Impostazioni from './screens/Impostazioni.svelte'
  import Oggi from './screens/Oggi.svelte'
  import Pioggia from './screens/Pioggia.svelte'

  type Tab = 'oggi' | 'giorni' | 'pioggia' | 'impostazioni'

  let location = $state<Location | null>(loadLocation())
  let tab = $state<Tab>('oggi')
  let data = $state<ForecastResult | null>(null)
  let loading = $state(false)
  let error = $state('')
  let horizon = $state<HorizonProfile | null>(null)
  let horizonLoading = $state(false)
  let horizonTried = $state(false)
  let history = $state<DayHistory[]>([])
  let climate = $state<Climate | null>(null)
  let soil = $state<SoilType>(loadSoil())
  let extrasFor = $state('')

  const insights = $derived(data ? computeInsights(data, history, soil) : null)

  function setSoil(s: SoilType) {
    soil = s
    saveSoil(s)
  }

  /** Slow data (60-day history, 25-year frost statistics): loaded once the forecast is there, failures are silent. */
  async function loadExtras() {
    if (!location || !data) return
    const k = `${location.lat},${location.lon}`
    if (extrasFor === k) return
    extrasFor = k
    const today = data.nowLocal.slice(0, 10)
    loadHistory(location, today).then((h) => (history = h)).catch(() => {})
    loadClimate(location, Number(today.slice(0, 4))).then((c) => (climate = c)).catch(() => {})
  }

  async function refreshHorizon(force = false) {
    if (!location) return
    horizonLoading = true
    try {
      horizon = await loadHorizon(location, { force, proxyUrl: loadProxyUrl() || null })
    } catch {
      // without a horizon the sun is computed on a flat horizon
    } finally {
      horizonLoading = false
      horizonTried = true
    }
  }

  async function refresh(force = false) {
    if (!location) return
    loading = true
    error = ''
    try {
      data = await loadForecast(location, { force })
    } catch (e) {
      error = 'Non riesco a scaricare le previsioni. Controlla la connessione.'
    } finally {
      loading = false
    }
  }

  function onsave(loc: Location) {
    saveLocation(loc)
    location = loc
    data = null
    horizon = null
    horizonTried = false
    history = []
    climate = null
    extrasFor = ''
    tab = 'oggi'
    refresh()
  }

  $effect(() => {
    if (location && !data && !loading) refresh()
  })

  $effect(() => {
    if (data) loadExtras()
  })

  $effect(() => {
    if (location && !horizon && !horizonLoading && !horizonTried) refreshHorizon()
  })
</script>

{#if !location}
  <main class="welcome">
    <img src="favicon.svg" alt="" width="96" height="96" />
    <h1>MeteOrto</h1>
    <LocationForm {onsave} />
  </main>
{:else}
  <header>
    <div>
      <b>MeteOrto</b>
      <small>
        {location.lat.toFixed(4)}, {location.lon.toFixed(4)}{location.elevation !== null ? ` · ${Math.round(location.elevation)} m` : ''}
      </small>
    </div>
    <button class="icon" onclick={() => refresh(true)} disabled={loading} aria-label="Aggiorna">{loading ? '⏳' : '🔄'}</button>
  </header>

  <main>
    {#if data?.stale}<p class="banner">Sei offline: ultima previsione salvata ({ageLabel(data.raw.fetchedAt)}).</p>{/if}
    {#if error}<p class="banner err">{error}</p>{/if}

    {#if tab === 'impostazioni'}
      <Impostazioni {location} {horizon} {onsave} onrecompute={() => refreshHorizon(true)} busy={horizonLoading} {soil} onsoil={setSoil} />
    {:else if data && insights}
      {#if tab === 'oggi'}
        <Oggi {data} {location} {horizon} horizonFailed={horizonTried && !horizon} {insights} />
      {:else if tab === 'giorni'}
        <Giorni {data} {location} {horizon} {insights} {climate} />
      {:else}
        <Pioggia {data} {history} {insights} />
      {/if}
      <p class="age">{ageLabel(data.raw.fetchedAt)} · {data.raw.models.length} modelli</p>
    {:else if loading}
      <p class="center">Scarico le previsioni…</p>
    {/if}
  </main>

  <nav>
    <button class:active={tab === 'oggi'} onclick={() => (tab = 'oggi')}><span>☀️</span>Oggi</button>
    <button class:active={tab === 'giorni'} onclick={() => (tab = 'giorni')}><span>📅</span>Giorni</button>
    <button class:active={tab === 'pioggia'} onclick={() => (tab = 'pioggia')}><span>🌧️</span>Pioggia</button>
    <button class:active={tab === 'impostazioni'} onclick={() => (tab = 'impostazioni')}><span>⚙️</span>Impostazioni</button>
  </nav>
{/if}

<style>
  .welcome { min-height: 100dvh; display: grid; align-content: center; justify-items: center; gap: 12px; padding: 16px; max-width: 480px; margin: 0 auto; }
  .welcome :global(form) { width: 100%; }
  h1 { margin: 0; }
  header { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--sole); }
  header div { display: grid; }
  header small { opacity: 0.8; }
  .icon { font-size: 1.4rem; background: none; border: 0; cursor: pointer; }
  main:not(.welcome) { max-width: 560px; margin: 0 auto; padding: 16px 16px 96px; }
  .banner { background: #fff3cd; border-radius: 14px; padding: 10px 12px; margin: 0 0 12px; font-size: 0.9rem; }
  .banner.err { background: #fde0dc; }
  .age { text-align: center; font-size: 0.8rem; opacity: 0.7; }
  .center { text-align: center; }
  nav { position: fixed; bottom: 0; left: 0; right: 0; display: grid; grid-template-columns: repeat(4, 1fr); background: #fff; border-top: 2px solid var(--pesca); padding-bottom: env(safe-area-inset-bottom); }
  nav button { background: none; border: 0; font: inherit; font-size: 0.8rem; padding: 8px 4px; display: grid; justify-items: center; cursor: pointer; color: inherit; opacity: 0.6; }
  nav button span { font-size: 1.5rem; }
  nav button.active { opacity: 1; font-weight: 700; }
</style>
