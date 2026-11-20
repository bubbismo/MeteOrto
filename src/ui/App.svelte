<script lang="ts">
  import type { DayHistory } from '../adapters/openmeteo/archive'
  import { loadLocation, loadMinSeasons, loadProxyUrl, loadSoil, saveLocation, saveMinSeasons, saveSoil } from '../adapters/storage/kv'
  import { reverseGeocode } from '../adapters/geocoding/reverse'
  import { ApiLimitError } from '../adapters/openmeteo/forecast'
  import { loadForecast, type ForecastResult } from '../app/forecastService'
  import { loadHorizon } from '../app/horizonService'
  import { loadClimate, loadHistory, type Climate } from '../app/historyService'
  import { computeInsights } from '../app/insights'
  import type { SoilType } from '../core/irrigation/irrigation'
  import { EMPTY_USER_CROPS, mergeCrops, newCustomCrop, type Crop, type UserCrops } from '../core/sowing/crops'
  import { BASE_CROPS, loadUserCrops, saveUserCrops } from '../app/cropsService'
  import type { HorizonProfile, Location } from '../core/types'
  import InstallHint from './components/InstallHint.svelte'
  import LocationForm from './components/LocationForm.svelte'
  import Skeleton from './components/Skeleton.svelte'
  import { ageLabel } from './format'
  import Giorni from './screens/Giorni.svelte'
  import Impostazioni from './screens/Impostazioni.svelte'
  import Oggi from './screens/Oggi.svelte'
  import Orto from './screens/Orto.svelte'
  import { JournalStore } from '../app/journal.svelte'
  import Pioggia from './screens/Pioggia.svelte'

  import { loadNav, saveNav, type Tab } from '../app/navState'
  import UpdateToast from './components/UpdateToast.svelte'
  import { scrollToTop } from './motion'

  let location = $state<Location | null>(loadLocation())
  // back to where the person was, if they were here a moment ago (e.g. after an app update)
  let tab = $state<Tab>(loadNav().tab)
  let scrollRestored = false

  // changing screen always starts from the top (also when tapping the screen you are already on)
  function go(t: Tab) {
    scrollToTop()
    tab = t
    saveNav({ tab: t, scroll: 0 })
  }

  // remember the scroll position (throttled)
  let scrollTimer: ReturnType<typeof setTimeout> | undefined
  function onscroll() {
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => saveNav({ scroll: Math.round(window.scrollY) }), 250)
  }
  $effect(() => {
    window.addEventListener('scroll', onscroll, { passive: true })
    return () => window.removeEventListener('scroll', onscroll)
  })
  // once the content is on screen, scroll to where the person was
  $effect(() => {
    if (!data || scrollRestored) return
    scrollRestored = true
    const y = loadNav().scroll
    if (y > 0) setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 350)
  })
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

  let userCrops = $state<UserCrops>(EMPTY_USER_CROPS)
  const journal = new JournalStore()
  journal.init()
  let minSeasons = $state<2 | 3>(loadMinSeasons())
  let refreshedWeatherFor = ''
  const crops = $derived(mergeCrops(BASE_CROPS, userCrops))
  loadUserCrops().then((u) => (userCrops = u))

  const insights = $derived(data ? computeInsights(data, history, soil, crops, climate) : null)

  function commitCrops(u: UserCrops) {
    userCrops = u
    saveUserCrops(u)
  }
  function patchCrop(id: string, patch: Partial<Crop>) {
    if (userCrops.custom.some((c) => c.id === id)) {
      commitCrops({ ...userCrops, custom: userCrops.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
    } else {
      commitCrops({ ...userCrops, overrides: { ...userCrops.overrides, [id]: { ...userCrops.overrides[id], ...patch } } })
    }
  }
  function resetCrop(id: string) {
    const overrides = { ...userCrops.overrides }
    delete overrides[id]
    commitCrops({ ...userCrops, overrides })
  }
  const addCrop = (name: string, emoji: string) => commitCrops({ ...userCrops, custom: [...userCrops.custom, newCustomCrop(name, emoji)] })
  const removeCrop = (id: string) => commitCrops({ ...userCrops, custom: userCrops.custom.filter((c) => c.id !== id) })

  function setMinSeasons(v: 2 | 3) {
    minSeasons = v
    saveMinSeasons(v)
  }
  function importedBackup(u: UserCrops, s: SoilType | null) {
    commitCrops(u)
    if (s) setSoil(s)
  }

  /** "Pievetta, Santo Stefano d'Aveto (44.6863, 9.8568) · 432 m", or just the coordinates when the name is unknown. */
  function placeLine(l: Location): string {
    const coords = `${l.lat.toFixed(4)}, ${l.lon.toFixed(4)}`
    const alt = l.elevation !== null ? ` · ${Math.round(l.elevation)} m` : ''
    return l.name ? `${l.name} (${coords})${alt}` : `${coords}${alt}`
  }

  // locations saved before names existed get theirs once, in the background
  let nameTried = false
  $effect(() => {
    if (!location || location.name || nameTried) return
    nameTried = true
    const here = location
    reverseGeocode(here.lat, here.lon).then((name) => {
      if (name && location && location.lat === here.lat && location.lon === here.lon) {
        location = { ...location, name }
        saveLocation(location)
      }
    })
  })

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

  // The automatic download is tried once per location: a failure must not turn into a retry loop
  let forecastTried = false

  async function refresh(force = false) {
    if (!location) return
    forecastTried = true
    loading = true
    error = ''
    try {
      data = await loadForecast(location, { force })
    } catch (e) {
      error =
        e instanceof ApiLimitError
          ? e.scope === 'giorno'
            ? 'Il servizio meteo gratuito ha esaurito le richieste di oggi per la tua rete. Si azzerano a mezzanotte UTC (circa le 01:00 in Italia). Se sei sul wifi di casa prova con i dati del telefono: un altro dispositivo sulla stessa rete condivide il limite.'
            : e.scope === 'ora'
              ? 'Il servizio meteo ha raggiunto il limite di richieste di quest’ora. Riprova tra poco.'
              : 'Troppe richieste in un minuto. Riprova tra un attimo.'
          : 'Non riesco a scaricare le previsioni. Controlla la connessione.'
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
    go('oggi')
    forecastTried = false
    nameTried = !!loc.name
    refresh()
  }

  $effect(() => {
    if (location && !data && !loading && !forecastTried) refresh()
  })

  $effect(() => {
    if (data) loadExtras()
  })

  // Weather of the days after each sowing is saved automatically, once a day
  $effect(() => {
    if (!data || !journal.loaded) return
    const today = data.nowLocal.slice(0, 10)
    if (refreshedWeatherFor === today) return
    refreshedWeatherFor = today
    journal.refreshWeather(today)
  })

  $effect(() => {
    if (location && !horizon && !horizonLoading && !horizonTried) refreshHorizon()
  })
</script>

{#if !location}
  <main class="welcome">
    <img src="favicon.svg" alt="" width="108" height="108" />
    <h1>MeteOrto</h1>
    <p class="tagline">Il meteo del tuo orto, a colpo d’occhio</p>
    <LocationForm {onsave} />
  </main>
{:else}
  <header>
    <div>
      <b>MeteOrto</b>
      <small class="where" title={placeLine(location)}>{placeLine(location)}</small>
    </div>
    <button class="icon" onclick={() => refresh(true)} disabled={loading} aria-label="Aggiorna le previsioni"><span class:spin={loading}>🔄</span></button>
  </header>

  <main>
    {#if data?.stale}<p class="banner">Sei offline: ultima previsione salvata ({ageLabel(data.raw.fetchedAt)}).</p>{/if}
    {#if error}
      <p class="banner err">{error} <button class="retry" onclick={() => refresh(true)}>Riprova</button></p>
    {/if}

    {#key tab}
    <div class="page">
    {#if tab === 'impostazioni'}
      <Impostazioni {location} {horizon} {onsave} onrecompute={() => refreshHorizon(true)} busy={horizonLoading} {soil} onsoil={setSoil} {journal} {userCrops} {minSeasons} onminseasons={setMinSeasons} onimport={importedBackup} />
    {:else if data && insights}
      {#if tab === 'oggi'}
        <Oggi {data} {location} {horizon} horizonFailed={horizonTried && !horizon} {insights} />
      {:else if tab === 'giorni'}
        <Giorni {data} {location} {horizon} {insights} {climate} />
      {:else if tab === 'pioggia'}
        <Pioggia {data} {history} {insights} />
      {:else}
        <Orto
          {insights}
          today={data.nowLocal.slice(0, 10)}
          {crops}
          {userCrops}
          {journal}
          place={{ lat: location.lat, lon: location.lon }}
          {minSeasons}
          onpatch={patchCrop}
          onreset={resetCrop}
          onadd={addCrop}
          onremove={removeCrop}
        />
      {/if}
    {:else if loading}
      <Skeleton />
    {/if}
    </div>
    {/key}
    {#if data}
      <p class="age">{ageLabel(data.raw.fetchedAt)} · {data.raw.models.length} modelli</p>
      {#if tab === 'oggi'}<InstallHint />{/if}
    {/if}
  </main>

  <UpdateToast />

  <nav aria-label="Sezioni">
    <button class:active={tab === 'oggi'} onclick={() => go('oggi')}><span>☀️</span>Oggi</button>
    <button class:active={tab === 'giorni'} onclick={() => go('giorni')}><span>📅</span>Giorni</button>
    <button class:active={tab === 'pioggia'} onclick={() => go('pioggia')}><span>🌧️</span>Pioggia</button>
    <button class:active={tab === 'orto'} onclick={() => go('orto')}><span>🌱</span>Orto</button>
    <button class:active={tab === 'impostazioni'} onclick={() => go('impostazioni')}><span>⚙️</span>Impostazioni</button>
  </nav>
{/if}

<style>
  .welcome { min-height: 100dvh; display: grid; align-content: center; justify-items: center; gap: 12px; padding: 16px; max-width: 480px; margin: 0 auto; }
  .welcome :global(form) { width: 100%; }
  .welcome { background: radial-gradient(circle at 50% 12%, #fff3b0, transparent 60%); }
  .welcome img { animation: float 4s ease-in-out infinite; filter: drop-shadow(0 8px 12px #ff9f1c55); }
  h1 { margin: 0; font-size: 2.1rem; }
  .tagline { margin: -6px 0 6px; opacity: 0.8; }
  header { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: linear-gradient(135deg, #ffc83d, #ffb627 60%, #ffa91c); box-shadow: 0 2px 12px #ff9f1c55; }
  header div { display: grid; min-width: 0; }
  header small { opacity: 0.8; }
  .where { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .icon { font-size: 1.4rem; background: none; border: 0; cursor: pointer; min-width: 44px; min-height: 44px; }
  .icon span { display: inline-block; }
  .spin { animation: rot 0.9s linear infinite; }
  main:not(.welcome) { max-width: 560px; margin: 0 auto; padding: 16px 16px 96px; }
  .banner { background: #fff3cd; border-radius: 14px; padding: 10px 12px; margin: 0 0 12px; font-size: 0.9rem; }
  .banner.err { background: #fde0dc; }
  .retry { font: inherit; font-weight: 700; margin-left: 6px; border: 0; border-radius: 10px; padding: 3px 12px; background: #fff; cursor: pointer; }
  .age { text-align: center; font-size: 0.8rem; opacity: 0.7; }
  nav { position: fixed; bottom: 0; left: 0; right: 0; display: grid; grid-template-columns: repeat(5, 1fr); background: #fffffff2; backdrop-filter: blur(8px); border-top: 2px solid var(--pesca); padding-bottom: env(safe-area-inset-bottom); z-index: 3; }
  nav button { position: relative; background: none; border: 0; font: inherit; font-size: 0.7rem; padding: 8px 4px; display: grid; justify-items: center; cursor: pointer; color: inherit; opacity: 0.72; min-height: 56px; }
  nav button span { font-size: 1.5rem; transition: transform 0.25s var(--ease); }
  nav button.active { opacity: 1; font-weight: 800; }
  nav button.active span { animation: pop 0.45s var(--ease); }
  nav button.active::before { content: ''; position: absolute; top: 4px; width: 46px; height: 32px; border-radius: 16px; background: var(--pesca); z-index: -1; animation: fade-in 0.3s both; }
  @keyframes pop { 0% { transform: scale(0.6) rotate(-12deg); } 60% { transform: scale(1.25) rotate(6deg); } 100% { transform: scale(1) rotate(0); } }
  @keyframes float { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-10px) rotate(3deg); } }
  @keyframes rot { to { transform: rotate(360deg); } }
</style>
