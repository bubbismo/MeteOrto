<script lang="ts">
  import type { DayHistory } from '../../adapters/openmeteo/archive'
  import type { ForecastResult } from '../../app/forecastService'
  import type { Insights } from '../../app/insights'
  import { buildPastWater } from '../../core/irrigation/inputs'
  import IrrigationCard from '../components/IrrigationCard.svelte'
  import RainChart, { type RainDay } from '../components/RainChart.svelte'
  import { mm } from '../format'

  let { data, history, insights }: { data: ForecastResult; history: DayHistory[]; insights: Insights } = $props()

  const past = $derived(buildPastWater(history, data.combined.hours, data.nowLocal, 30).filter((d) => d.date < data.nowLocal.slice(0, 10)))
  const chart = $derived<RainDay[]>([
    ...past.map((d) => ({ date: d.date, mm: d.precip, kind: 'past' as const })),
    ...data.combined.days.slice(0, 6).map((d, i) => ({ date: d.date, mm: d.precipSum, kind: i === 0 ? ('today' as const) : ('forecast' as const) })),
  ])
  const sum = (arr: { precip: number }[]) => arr.reduce((a, d) => a + d.precip, 0)
  const last7 = $derived(sum(past.slice(-7)))
  const last30 = $derived(sum(past))
  const next5 = $derived(data.combined.days.slice(0, 5).reduce((a, d) => a + d.precipSum, 0))
  const et0Today = $derived(data.combined.days[0]?.et0Sum ?? 0)
</script>

<IrrigationCard advice={insights.advice} />

<h2>Pioggia</h2>
<div class="chips">
  <div><b>{mm(last7)}</b> mm<small>ultimi 7 giorni</small></div>
  <div><b>{mm(last30)}</b> mm<small>ultimi 30 giorni</small></div>
  <div><b>{mm(next5)}</b> mm<small>prossimi 5 giorni</small></div>
</div>
<RainChart days={chart} />
<p class="note">Evaporazione di oggi: circa {mm(et0Today)} mm (è l’acqua che il terreno e le piante perdono).</p>

<style>
  h2 { font-size: 1rem; margin: 18px 4px 8px; }
  .chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .chips div { background: #fff; border-radius: 18px; padding: 8px 4px; text-align: center; display: grid; }
  .chips b { font-size: 1.3rem; }
  .chips small { opacity: 0.7; font-size: 0.72rem; }
  .note { font-size: 0.85rem; opacity: 0.8; margin: 10px 4px; }
</style>
