<script lang="ts">
  import { untrack } from 'svelte'
  import type { DayHistory } from '../../adapters/openmeteo/archive'
  import type { Climate } from '../../app/historyService'
  import type { ForecastResult } from '../../app/forecastService'
  import type { Insights } from '../../app/insights'
  import { ensureRange } from '../../app/rainArchive'
  import { addDays } from '../../core/dates'
  import { RAINY_DAY_MM, buildRainDays, compareToAverage, groupByMonth, intensity, rainStats, type MonthRain, type RainDay } from '../../core/rain/rain'
  import type { Location } from '../../core/types'
  import IrrigationCard from '../components/IrrigationCard.svelte'
  import RainBars, { type Bar } from '../components/RainBars.svelte'
  import { dayFull, dayLabel, mm, mm1, monthName, monthShort, weekdayShort } from '../format'

  let { data, insights, location, climate }: { data: ForecastResult; insights: Insights; location: Location; climate: Climate | null } = $props()

  type Period = 'giorni' | 'mese' | 'anno'
  const pad = (n: number) => String(n).padStart(2, '0')

  const today = $derived(data.nowLocal.slice(0, 10))
  let period = $state<Period>('giorni')
  let monthCursor = $state(untrack(() => data.nowLocal.slice(0, 7))) // "YYYY-MM"
  let yearCursor = $state(untrack(() => Number(data.nowLocal.slice(0, 4))))
  let selected = $state<string | null>(null)
  let showAll = $state(false)

  // ---------------------------------------------------------------- data: the archive grows as periods are opened
  let archive = $state<DayHistory[]>([])
  let loading = $state(false)
  let failed = $state(false)
  let token = 0

  const range = $derived.by(() => {
    if (period === 'giorni') return { from: addDays(today, -6), to: addDays(today, 5) }
    if (period === 'mese') {
      const [y, m] = monthCursor.split('-').map(Number)
      return { from: `${monthCursor}-01`, to: `${monthCursor}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}` }
    }
    return { from: `${yearCursor}-01-01`, to: `${yearCursor}-12-31` }
  })

  $effect(() => {
    const { from, to } = range
    const mine = ++token
    loading = true
    failed = false
    ensureRange(location, from, to, today)
      .then((d) => {
        if (mine !== token) return
        archive = d
        // nothing stored and nothing downloaded for a past period: say so instead of showing an empty chart
        failed = d.length === 0 && to < today
      })
      .finally(() => {
        if (mine === token) loading = false
      })
  })

  const days = $derived(buildRainDays(archive, data.combined.hours, data.combined.days, data.nowLocal, range.from, range.to))
  const byDate = $derived(new Map(days.map((d) => [d.date, d])))
  const stats = $derived(rainStats(days))
  const months = $derived<MonthRain[]>(groupByMonth(days.filter((d) => d.kind !== 'forecast').map((d) => ({ date: d.date, mm: d.mm })), yearCursor))
  const avg = $derived(climate?.rain && climate.rain.years > 0 ? climate.rain : null)

  // ---------------------------------------------------------------- bars
  const allDates = $derived.by(() => {
    const out: string[] = []
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d)
    return out
  })

  const bars = $derived.by((): Bar[] => {
    if (period === 'anno') {
      return months.map((m, i) => ({
        key: `${yearCursor}-${pad(m.month)}`,
        label: `${monthName(m.month)} ${yearCursor}`,
        mm: m.mm,
        kind: 'past',
        tick: monthShort(m.month),
        missing: m.days === 0,
        avg: avg?.mm[i],
      }))
    }
    return allDates.map((date, i) => {
      const d = byDate.get(date)
      const dayNum = Number(date.slice(8, 10))
      let tick = ''
      let tick2: string | undefined
      if (period === 'giorni') {
        // few bars: every one gets its weekday and day number
        tick = date === today ? 'oggi' : weekdayShort(date)
        tick2 = String(dayNum)
      } else {
        tick = [1, 5, 10, 15, 20, 25].includes(dayNum) || (dayNum === allDates.length && allDates.length - 25 >= 3) ? String(dayNum) : ''
      }
      return { key: date, label: dayLabel(date), mm: d?.mm ?? 0, kind: d?.kind ?? 'past', expectedMm: d?.expectedMm, tick, tick2, missing: !d }
    })
  })

  const selectedDay = $derived<RainDay | null>(selected && period !== 'anno' ? (byDate.get(selected) ?? null) : null)
  const selectedMonth = $derived(selected && period === 'anno' ? (months.find((m) => `${yearCursor}-${pad(m.month)}` === selected) ?? null) : null)

  function pickBar(key: string) {
    selected = selected === key ? null : key
  }

  // ---------------------------------------------------------------- navigation
  const thisMonth = $derived(today.slice(0, 7))
  const thisYear = $derived(Number(today.slice(0, 4)))
  const FIRST_YEAR = $derived(thisYear - 10)

  function setPeriod(p: Period) {
    period = p
    selected = null
    showAll = false
  }
  function moveMonth(delta: number) {
    const [y, m] = monthCursor.split('-').map(Number)
    const d = new Date(Date.UTC(y, m - 1 + delta, 1))
    const next = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
    if (next > thisMonth || d.getUTCFullYear() < FIRST_YEAR) return
    monthCursor = next
    selected = null
    showAll = false
  }
  function moveYear(delta: number) {
    const y = yearCursor + delta
    if (y > thisYear || y < FIRST_YEAR) return
    yearCursor = y
    selected = null
  }
  function openMonth(m: number) {
    monthCursor = `${yearCursor}-${pad(m)}`
    setPeriod('mese')
  }

  // ---------------------------------------------------------------- texts
  const INTENSITY = { trace: 'tracce o niente', debole: 'pioggia debole', moderata: 'pioggia moderata', forte: 'pioggia forte' } as const
  const [cy, cm] = $derived(monthCursor.split('-').map(Number))
  const title = $derived(period === 'giorni' ? 'Ultimi 7 giorni' : period === 'mese' ? `${monthName(cm)} ${cy}` : String(yearCursor))
  const isCurrentMonth = $derived(monthCursor === thisMonth)
  const isCurrentYear = $derived(yearCursor === thisYear)

  const rainyList = $derived(days.filter((d) => d.kind !== 'forecast' && d.mm >= RAINY_DAY_MM).sort((a, b) => b.date.localeCompare(a.date)))
  const coming = $derived(days.filter((d) => d.kind === 'forecast' && d.mm >= RAINY_DAY_MM))
  const comingTotal = $derived(days.filter((d) => d.kind === 'forecast').reduce((a, d) => a + d.mm, 0))
  const shown = $derived(showAll ? rainyList : rainyList.slice(0, 8))
  const maxList = $derived(Math.max(1, ...rainyList.map((d) => d.mm), ...coming.map((d) => d.mm)))

  // comparison with the usual rain of the period (25-year average of this place)
  const comparison = $derived.by(() => {
    if (!avg) return null
    if (period === 'mese') {
      const usual = avg.mm[cm - 1]
      const total = stats.total
      const done = isCurrentMonth
      const sofar = Number(today.slice(8, 10)) / new Date(Date.UTC(cy, cm, 0)).getUTCDate()
      return { name: monthName(cm), usual, usualDays: avg.rainyDays[cm - 1], total, partial: done, fraction: sofar, ...compareToAverage(done ? total : total, done ? usual * sofar : usual) }
    }
    if (period === 'anno') {
      let usual = 0
      let usualDays = 0
      for (let m = 1; m <= 12; m++) {
        const frac = isCurrentYear ? (m < Number(today.slice(5, 7)) ? 1 : m === Number(today.slice(5, 7)) ? Number(today.slice(8, 10)) / new Date(Date.UTC(cy, m, 0)).getUTCDate() : 0) : 1
        usual += avg.mm[m - 1] * frac
        usualDays += avg.rainyDays[m - 1] * frac
      }
      return { name: String(yearCursor), usual, usualDays, total: stats.total, partial: isCurrentYear, fraction: 1, ...compareToAverage(stats.total, usual) }
    }
    return null
  })
  const LEVEL = { 'molto-meno': 'molto più asciutto del solito', meno: 'più asciutto del solito', 'nella-media': 'nella media', piu: 'più piovoso del solito', 'molto-piu': 'molto più piovoso del solito' } as const

  /** Usual rain of a month of the year on screen; for the month in progress only the share elapsed so far. */
  function usualFor(month: number): { usual: number; partial: boolean } {
    const full = avg?.mm[month - 1] ?? 0
    const now = yearCursor === thisYear && month === Number(today.slice(5, 7))
    const share = Number(today.slice(8, 10)) / new Date(Date.UTC(yearCursor, month, 0)).getUTCDate()
    return { usual: now ? full * share : full, partial: now }
  }

  const monthWettest = $derived(period === 'anno' ? [...months].sort((a, b) => b.mm - a.mm)[0] : null)
  const dryAgo = $derived(stats.lastRain ? stats.lastRain : null)
</script>

<IrrigationCard advice={insights.advice} />

<div class="seg" role="tablist" aria-label="Periodo">
  {#each [['giorni', '7 giorni'], ['mese', 'Mese'], ['anno', 'Anno']] as [p, label]}
    <button role="tab" aria-selected={period === p} class:on={period === p} onclick={() => setPeriod(p as Period)}>{label}</button>
  {/each}
</div>

<div class="head">
  {#if period !== 'giorni'}
    <button class="arrow" aria-label="Periodo precedente" onclick={() => (period === 'mese' ? moveMonth(-1) : moveYear(-1))} disabled={period === 'mese' ? cy <= FIRST_YEAR && cm === 1 : yearCursor <= FIRST_YEAR}>‹</button>
  {/if}
  <h2>{title}</h2>
  {#if period !== 'giorni'}
    <button class="arrow" aria-label="Periodo successivo" onclick={() => (period === 'mese' ? moveMonth(1) : moveYear(1))} disabled={period === 'mese' ? isCurrentMonth : isCurrentYear}>›</button>
  {/if}
</div>

<!-- the numbers that matter, big -->
<div class="tiles">
  <div class="tile main"><b>{mm1(stats.total)}</b><span>mm caduti</span></div>
  <div class="tile"><b>{stats.rainyDays}</b><span>{stats.rainyDays === 1 ? 'giorno' : 'giorni'} di pioggia</span></div>
  {#if period === 'anno' && monthWettest && monthWettest.mm > 0}
    <div class="tile"><b>{mm(monthWettest.mm)} mm</b><span>mese più piovoso: {monthName(monthWettest.month)}</span></div>
  {:else if stats.maxDay}
    <div class="tile"><b>{mm1(stats.maxDay.mm)} mm</b><span>giorno più piovoso: {dayLabel(stats.maxDay.date)}</span></div>
  {:else}
    <div class="tile"><b>–</b><span>nessun giorno di pioggia</span></div>
  {/if}
  {#if period === 'giorni' || isCurrentMonth}
    <div class="tile dry">
      {#if stats.dryNow > 0}
        <b>{stats.dryNow}</b><span>{stats.dryNow === 1 ? 'giorno' : 'giorni'} senza pioggia{dryAgo ? ` · ultima ${dayLabel(dryAgo.date)}` : ''}</span>
      {:else}
        <b>💧</b><span>ha piovuto {stats.lastRain?.date === today ? 'oggi' : 'ieri'}</span>
      {/if}
    </div>
  {:else}
    <div class="tile dry"><b>{stats.longestDry}</b><span>giorni: periodo secco più lungo</span></div>
  {/if}
</div>

<!-- chart -->
{#if loading && days.length === 0}
  <div class="sk" aria-busy="true">Carico lo storico…</div>
{:else if failed}
  <p class="empty">Lo storico di questo periodo non è disponibile: serve la connessione (o il servizio ha raggiunto il limite di richieste). Riprova più tardi.</p>
{:else}
  <figure class="chart">
    <RainBars {bars} {selected} onselect={pickBar} labelAll={period !== 'mese'} />
    <figcaption>
      <span><i class="c1"></i>&lt; 1 mm</span><span><i class="c2"></i>debole</span><span><i class="c3"></i>10–30</span><span><i class="c4"></i>oltre 30</span>
      {#if period === 'anno'}<span><i class="avgm"></i>media {avg?.years ?? 25} anni</span>{:else}<span><i class="fc"></i>prevista</span>{/if}
    </figcaption>
  </figure>

  <!-- detail of the tapped bar -->
  <section class="detail" aria-live="polite">
    {#if selectedDay}
      <div class="d-top">
        <div>
          <b class="d-date">{dayFull(selectedDay.date)}</b>
          <span class="d-kind">{selectedDay.kind === 'forecast' ? 'previsione' : selectedDay.kind === 'today' ? 'oggi, finora' : INTENSITY[intensity(selectedDay.mm)]}</span>
        </div>
        <b class="d-mm">{mm1(selectedDay.mm)}<small> mm</small></b>
      </div>
      {#if selectedDay.kind === 'today' && selectedDay.expectedMm !== undefined}
        <p>Previsti in tutto oggi: <b>{mm1(selectedDay.expectedMm)} mm</b></p>
      {/if}
      {#if selectedDay.tMin !== null && selectedDay.tMax !== null}
        <p>Temperature: {Math.round(selectedDay.tMin)}° / {Math.round(selectedDay.tMax)}°</p>
      {/if}
    {:else if selectedMonth}
      <div class="d-top">
        <div>
          <b class="d-date">{monthName(selectedMonth.month).replace(/^./, (c) => c.toUpperCase())} {yearCursor}</b>
          <span class="d-kind">{selectedMonth.rainyDays} giorni di pioggia su {selectedMonth.days}</span>
        </div>
        <b class="d-mm">{mm(selectedMonth.mm)}<small> mm</small></b>
      </div>
      {#if avg && avg.mm[selectedMonth.month - 1] > 0}
        {@const u = usualFor(selectedMonth.month)}
        {@const c = compareToAverage(selectedMonth.mm, u.usual)}
        <p>
          Di solito {u.partial ? 'a questo punto ' : ''}{mm(u.usual)} mm{c.pct !== null ? ` · ${c.pct > 0 ? '+' : ''}${c.pct}% rispetto alla media` : ''}
        </p>
      {/if}
      <button class="go" onclick={() => openMonth(selectedMonth.month)}>Vedi i giorni di {monthName(selectedMonth.month)} →</button>
    {:else}
      <p class="hint">👆 Tocca una barra per vedere quel {period === 'anno' ? 'mese' : 'giorno'}.</p>
    {/if}
  </section>

  <!-- how this period compares with the usual -->
  {#if comparison && comparison.usual > 0}
    <section class="compare">
      <b>{comparison.pct === null ? 'Rispetto al solito' : `${comparison.pct > 0 ? '+' : ''}${comparison.pct}% rispetto alla media`}</b>
      <p>
        {comparison.partial ? 'Finora' : 'In'} {comparison.name}: <b>{mm(comparison.total)} mm</b>, {LEVEL[comparison.level]}.
        Di solito {comparison.partial ? 'a questo punto' : ''} {mm(comparison.usual)} mm in circa {Math.round(comparison.usualDays)} giorni di pioggia
        <small>(media degli ultimi {avg?.years} anni nel tuo punto)</small>
      </p>
    </section>
  {/if}

  <!-- the list: when did it rain? -->
  {#if period === 'anno'}
    <h3>Mese per mese</h3>
    <ul class="list">
      {#each months.filter((m) => m.days > 0) as m (m.month)}
        {@const u = usualFor(m.month)}
        {@const c = u.usual > 0 ? compareToAverage(m.mm, u.usual) : null}
        <li>
          <button onclick={() => openMonth(m.month)}>
            <span class="when">{monthName(m.month).replace(/^./, (x) => x.toUpperCase())}</span>
            <span class="barwrap"><i style="width:{Math.max(2, (m.mm / Math.max(1, ...months.map((x) => x.mm))) * 100)}%"></i></span>
            <span class="amount">{mm(m.mm)} mm</span>
            <small>{m.rainyDays} gg{c && c.pct !== null ? ` · ${c.pct > 0 ? '+' : ''}${c.pct}%${u.partial ? ' finora' : ''}` : ''}</small>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    {#if period === 'giorni'}
      <h3>Prossimi 5 giorni <small>{mm(comingTotal)} mm previsti</small></h3>
      {#if coming.length}
        <ul class="list">
          {#each coming as d (d.date)}
            <li class="fc">
              <button class:sel={selected === d.date} onclick={() => pickBar(d.date)}>
                <span class="when">{dayLabel(d.date)}</span>
                <span class="barwrap"><i style="width:{Math.max(3, (d.mm / maxList) * 100)}%"></i></span>
                <span class="amount">{mm(d.mm)} mm</span>
                <small>prevista</small>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty">Nessuna pioggia significativa prevista.</p>
      {/if}
    {/if}

    <h3>Quando è piovuto <small>{rainyList.length} {rainyList.length === 1 ? 'giorno' : 'giorni'}</small></h3>
    {#if rainyList.length}
      <ul class="list">
        {#each shown as d (d.date)}
          <li>
            <button class:sel={selected === d.date} onclick={() => pickBar(d.date)}>
              <span class="when">{dayLabel(d.date)}</span>
              <span class="barwrap"><i class="i-{intensity(d.mm)}" style="width:{Math.max(3, (d.mm / maxList) * 100)}%"></i></span>
              <span class="amount">{mm(d.mm)} mm</span>
              <small>{d.kind === 'today' ? 'oggi' : ''}</small>
            </button>
          </li>
        {/each}
      </ul>
      {#if rainyList.length > shown.length}
        <button class="more" onclick={() => (showAll = true)}>Mostra tutti i {rainyList.length} giorni</button>
      {/if}
    {:else}
      <p class="empty">Nessun giorno di pioggia (almeno {RAINY_DAY_MM} mm) in questo periodo.</p>
    {/if}
  {/if}
{/if}

<p class="note">
  Evaporazione di oggi: circa {mm(data.combined.days[0]?.et0Sum ?? 0)} mm (è l’acqua che il terreno e le piante perdono). Un “giorno di pioggia” ha almeno {RAINY_DAY_MM} mm.
</p>

<style>
  .seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: var(--pesca); border-radius: 18px; padding: 4px; margin: 14px 0 10px; }
  .seg button { font: inherit; font-size: 0.9rem; font-weight: 600; border: 0; border-radius: 14px; padding: 9px 4px; background: none; color: var(--testo); cursor: pointer; }
  .seg button.on { background: #fff; font-weight: 800; box-shadow: 0 1px 3px #0002; }

  .head { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
  h2 { font-size: 1.2rem; margin: 0; min-width: 150px; text-align: center; }
  .arrow { width: 44px; height: 44px; font-size: 1.6rem; line-height: 1; border: 0; border-radius: 14px; background: #fff; color: var(--testo); cursor: pointer; box-shadow: var(--ombra); }
  .arrow:disabled { opacity: 0.3; cursor: default; }

  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .tile { background: #fff; border-radius: 20px; padding: 10px 12px; display: grid; gap: 1px; box-shadow: var(--ombra); }
  .tile b { font-size: 1.7rem; line-height: 1.1; }
  .tile span { font-size: 0.8rem; opacity: 0.8; }
  .tile.main { background: linear-gradient(135deg, #e1f5fe, #fff); }
  .tile.main b { color: #01579b; font-size: 2rem; }
  .tile.dry { background: #fff8e1; }

  .chart { margin: 0; }
  figcaption { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.78rem; margin-top: 6px; opacity: 0.9; }
  figcaption span { display: inline-flex; align-items: center; gap: 5px; }
  figcaption i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .c1 { background: #b6dff2; } .c2 { background: #4fc3f7; } .c3 { background: #0288d1; } .c4 { background: #01579b; }
  .fc { background: #4fc3f780; border: 1px dashed #0288d1; }
  .avgm { height: 3px !important; background: #ff9f1c; width: 14px !important; border-radius: 2px !important; }

  .detail { background: #fff; border-radius: 20px; padding: 12px 14px; margin-top: 10px; box-shadow: var(--ombra); min-height: 58px; }
  .d-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .d-date { display: block; font-size: 1.05rem; }
  .d-kind { font-size: 0.82rem; opacity: 0.75; }
  .d-mm { font-size: 2.2rem; color: #01579b; line-height: 1; }
  .d-mm small { font-size: 0.9rem; font-weight: 600; }
  .detail p { margin: 6px 0 0; font-size: 0.9rem; }
  .detail .hint { opacity: 0.7; margin: 0; }
  .go { margin-top: 8px; font: inherit; font-weight: 700; font-size: 0.88rem; border: 0; border-radius: 12px; padding: 8px 14px; background: var(--pesca); color: var(--testo); cursor: pointer; }

  .compare { background: #e8f5e9; border-radius: 20px; padding: 10px 14px; margin-top: 10px; }
  .compare p { margin: 4px 0 0; font-size: 0.88rem; }
  .compare small { opacity: 0.75; }

  h3 { font-size: 1rem; margin: 20px 4px 6px; display: flex; justify-content: space-between; align-items: baseline; }
  h3 small { font-weight: 500; opacity: 0.7; font-size: 0.82rem; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .list button { width: 100%; display: grid; grid-template-columns: 6.6em 1fr auto; grid-template-areas: 'when bar amount' 'when bar sub'; align-items: center; gap: 0 10px; font: inherit; color: inherit; text-align: left; background: #fff; border: 2px solid transparent; border-radius: 16px; padding: 8px 12px; cursor: pointer; box-shadow: var(--ombra); }
  .list button.sel { border-color: var(--sole-scuro); background: #fffaf0; }
  .when { grid-area: when; font-weight: 700; font-size: 0.92rem; white-space: nowrap; }
  .barwrap { grid-area: bar; height: 12px; background: #eef5f9; border-radius: 6px; overflow: hidden; }
  .barwrap i { display: block; height: 100%; border-radius: 6px; background: #4fc3f7; }
  .i-moderata { background: #0288d1 !important; } .i-forte { background: #01579b !important; }
  li.fc .barwrap i { background: repeating-linear-gradient(135deg, #4fc3f7 0 5px, #b3e5fc 5px 10px); }
  .amount { grid-area: amount; font-weight: 800; font-size: 1.1rem; text-align: right; color: #01579b; }
  .list small { grid-area: sub; text-align: right; font-size: 0.72rem; opacity: 0.7; min-height: 1em; }
  .more { width: 100%; margin-top: 8px; font: inherit; font-weight: 700; padding: 11px; border: 0; border-radius: 14px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  .empty { background: #fff; border-radius: 16px; padding: 12px 14px; margin: 8px 0; font-size: 0.9rem; opacity: 0.85; }
  .sk { height: 230px; border-radius: 18px; display: grid; place-items: center; background: linear-gradient(100deg, #fff0c4 30%, #fff9e6 50%, #fff0c4 70%); background-size: 220% 100%; animation: shimmer 1.4s linear infinite; }
  @keyframes shimmer { to { background-position: -220% 0; } }
  .note { font-size: 0.82rem; opacity: 0.75; margin: 16px 4px; }
</style>
