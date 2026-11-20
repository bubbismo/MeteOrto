<script lang="ts">
  import type { Climate } from '../../app/historyService'
  import type { ForecastResult } from '../../app/forecastService'
  import type { Insights } from '../../app/insights'
  import { daySun } from '../../core/sun/sun'
  import type { HorizonProfile, Location } from '../../core/types'
  import FrostBanner from '../components/FrostBanner.svelte'
  import FrostClimate from '../components/FrostClimate.svelte'
  import WeatherIcon from '../components/WeatherIcon.svelte'
  import { dayName, deg, duration, mm, skyLabel } from '../format'

  let {
    data,
    location,
    horizon,
    insights,
    climate,
  }: { data: ForecastResult; location: Location; horizon: HorizonProfile | null; insights: Insights; climate: Climate | null } = $props()
  const days = $derived(
    data.combined.days.slice(0, 5).map((d) => ({
      ...d,
      sun: daySun(d.date, data.raw.utcOffsetSeconds, location.lat, location.lon, horizon, data.combined.hours.filter((h) => h.time.startsWith(d.date))),
    })),
  )
  const dots = { alta: 3, media: 2, bassa: 1 } as const
</script>

<FrostBanner nights={insights.frost} />

<div class="list">
  {#each days as d}
    <article class:sunny={d.sky === 'sun'}>
      <div class="name">{dayName(d.date, d.dayIndex)}<small>{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</small></div>
      <WeatherIcon sky={d.sky} size={52} />
      <div class="temps"><b>{deg(d.tMax)}</b><span>{deg(d.tMin)}</span></div>
      <div class="extra">
        <span title="Pioggia">🌧️ {mm(d.precipSum)} mm</span>
        <span title="Vento e raffiche">💨 {Math.round(d.windMax ?? 0)} / {Math.round(d.gustMax ?? 0)}</span>
        <span title="Sole diretto nell’orto">☀️ {duration(d.sun.effectiveMinutes)}</span>
      </div>
      <div class="rel" title={`Affidabilità ${d.reliability.level}`} aria-label={`Affidabilità ${d.reliability.level}`}>
        {#each [1, 2, 3] as n}<i class:on={n <= dots[d.reliability.level]}></i>{/each}
        <small>{skyLabel(d.sky)}</small>
      </div>
    </article>
  {/each}
</div>
<p class="legend">● ● ● = quanto i modelli concordano</p>

{#if climate}<FrostClimate {climate} today={data.nowLocal.slice(0, 10)} />{/if}

<style>
  .list { display: grid; gap: 10px; }
  article { display: grid; grid-template-columns: 64px 52px 56px 1fr 44px; align-items: center; gap: 8px; background: #fff; border-radius: 22px; padding: 10px 12px; }
  article.sunny { background: linear-gradient(90deg, #ffe08a, #fff1c2); }
  .name { font-weight: 700; display: grid; }
  .name small { font-weight: 400; opacity: 0.7; }
  .temps { display: grid; text-align: center; }
  .temps span { opacity: 0.6; }
  .extra { display: grid; font-size: 0.85rem; gap: 2px; }
  .rel { display: grid; justify-items: center; gap: 2px; grid-auto-flow: column; }
  .rel small { display: none; }
  i { width: 8px; height: 8px; border-radius: 50%; background: #e0d6b8; display: inline-block; }
  i.on { background: var(--foglia); }
  .legend { text-align: center; font-size: 0.8rem; opacity: 0.7; }
</style>
