<script lang="ts">
  import type { ForecastResult } from '../../app/forecastService'
  import type { Insights } from '../../app/insights'
  import { daySun, formatLocalTime, isDaylight } from '../../core/sun/sun'
  import type { HorizonProfile, Location } from '../../core/types'
  import FrostBanner from '../components/FrostBanner.svelte'
  import HorizonChart from '../components/HorizonChart.svelte'
  import IrrigationCard from '../components/IrrigationCard.svelte'
  import WorkWindowsCard from '../components/WorkWindowsCard.svelte'
  import WeatherIcon from '../components/WeatherIcon.svelte'
  import { deg, duration, mm, skyLabel } from '../format'

  let {
    data,
    location,
    horizon,
    horizonFailed = false,
    insights,
  }: { data: ForecastResult; location: Location; horizon: HorizonProfile | null; horizonFailed?: boolean; insights: Insights } = $props()

  const offset = $derived(data.raw.utcOffsetSeconds)
  const nowHour = $derived(data.nowLocal.slice(0, 13) + ':00')
  const idx = $derived(data.combined.hours.findIndex((h) => h.time >= nowHour))
  const now = $derived(data.combined.hours[idx])
  const next = $derived(data.combined.hours.slice(idx + 1, idx + 13))
  const rain24 = $derived(data.combined.hours.slice(idx, idx + 24).reduce((a, h) => a + (h.precipitation ?? 0), 0))
  const today = $derived(data.combined.days[0])
  const night = (time: string) => !isDaylight(time, offset, location.lat, location.lon)

  const sun = $derived(
    today
      ? daySun(
          today.date,
          offset,
          location.lat,
          location.lon,
          horizon,
          data.combined.hours.filter((h) => h.time.startsWith(today.date)),
        )
      : null,
  )
  const nowEpoch = $derived(Date.now())
</script>

{#if now}
  <FrostBanner nights={insights.frost} />

  <section class="hero" class:sunny={now.sky === 'sun' && !night(now.time)}>
    <WeatherIcon sky={now.sky} night={night(now.time)} size={140} />
    <div class="temp">{deg(now.temperature)}</div>
    <div class="label">{skyLabel(now.sky)}</div>
    {#if today}<div class="minmax">↓ {deg(today.tMin)} &nbsp; ↑ {deg(today.tMax)}</div>{/if}
  </section>

  <section class="stats">
    <div><span>💨</span><b>{Math.round(now.windSpeed ?? 0)}</b> km/h<small>raffiche {Math.round(now.windGusts ?? 0)}</small></div>
    <div><span>🌧️</span><b>{mm(rain24)}</b> mm<small>prossime 24 h</small></div>
    <div><span>🌱</span><b>{deg(now.soilTemp6)}</b><small>terreno</small></div>
  </section>

  <IrrigationCard advice={insights.advice} />
  <WorkWindowsCard windows={insights.work} today={data.nowLocal.slice(0, 10)} />

  {#if sun}
    <section class="sun">
      <h2>☀️ Sole diretto nell’orto</h2>
      {#if sun.windows.length}
        <p class="times">
          {#each sun.windows as w, i}{i ? ' · ' : ''}<b>{formatLocalTime(w.start, offset)} → {formatLocalTime(w.end, offset)}</b>{/each}
        </p>
        <p class="sub">{duration(sun.directMinutes)} possibili · circa <b>{duration(sun.effectiveMinutes)}</b> con le nuvole previste</p>
      {:else}
        <p class="times">Oggi il sole non arriva direttamente</p>
      {/if}
      <HorizonChart {horizon} date={today.date} utcOffsetSeconds={offset} lat={location.lat} lon={location.lon} {nowEpoch} />
      {#if !horizon}
        <p class="sub">{horizonFailed ? 'Orizzonte non disponibile: il sole è calcolato su un orizzonte piatto. Riprova da Impostazioni.' : 'Calcolo l’orizzonte…'}</p>
      {/if}
    </section>
  {/if}

  <h2>Prossime ore</h2>
  <div class="hours">
    {#each next as h}
      <div class="hour">
        <small>{h.time.slice(11, 16)}</small>
        <WeatherIcon sky={h.sky} night={night(h.time)} size={40} />
        <b>{deg(h.temperature)}</b>
        <small class="rain">{(h.precipitation ?? 0) >= 0.1 ? mm(h.precipitation ?? 0) : ''}</small>
      </div>
    {/each}
  </div>
{:else}
  <p>Nessun dato disponibile.</p>
{/if}

<style>
  .hero { text-align: center; padding: 16px 12px; border-radius: 28px; background: #fff; margin-bottom: 16px; }
  .hero.sunny { background: linear-gradient(180deg, #ffe08a, #fff1c2); }
  .temp { font-size: 4rem; font-weight: 800; line-height: 1; }
  .label { font-size: 1.2rem; margin-top: 4px; }
  .minmax { margin-top: 6px; opacity: 0.8; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
  .stats div { background: #fff; border-radius: 20px; padding: 10px 6px; text-align: center; display: grid; gap: 2px; }
  .stats span { font-size: 1.5rem; }
  .stats small { opacity: 0.7; font-size: 0.75rem; }
  .sun { background: #fff; border-radius: 24px; padding: 12px; margin-top: 8px; }
  .sun h2 { margin: 0 0 6px; }
  .times { margin: 0; font-size: 1.25rem; }
  .sub { margin: 2px 0 8px; font-size: 0.85rem; opacity: 0.8; }
  h2 { font-size: 1rem; margin: 16px 4px 8px; }
  .hours { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
  .hour { flex: 0 0 62px; background: #fff; border-radius: 18px; padding: 8px 4px; display: grid; justify-items: center; gap: 2px; }
  .hour small { opacity: 0.7; font-size: 0.75rem; min-height: 1em; }
  .hour .rain { color: #0288d1; opacity: 1; }
</style>
