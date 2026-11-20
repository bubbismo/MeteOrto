<script lang="ts">
  import { moonAt, moonMonth, nextMainPhase, type MoonPhaseName } from '../../core/moon/moon'

  let { today }: { today: string } = $props()

  const NAMES: Record<MoonPhaseName, string> = {
    nuova: 'Luna nuova',
    crescente: 'Luna crescente',
    'primo-quarto': 'Primo quarto',
    'gibbosa-crescente': 'Gibbosa crescente',
    piena: 'Luna piena',
    'gibbosa-calante': 'Gibbosa calante',
    'ultimo-quarto': 'Ultimo quarto',
    calante: 'Luna calante',
  }
  const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

  const now = $derived(moonAt(today))
  const next = $derived(nextMainPhase(today))
  const year = $derived(Number(today.slice(0, 4)))
  const month = $derived(Number(today.slice(5, 7)))
  const days = $derived(moonMonth(year, month))
  // Monday-first grid
  const offset = $derived((new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7)
  const nextText = $derived(
    `${next.kind === 'piena' ? 'piena' : 'nuova'} ${next.inDays === 1 ? 'domani' : `tra ${next.inDays} giorni`}`,
  )
</script>

<section>
  <div class="top">
    <div class="emoji">{now.emoji}</div>
    <div>
      <h2>{NAMES[now.name]}</h2>
      <p>
        <b>{now.waxing ? 'Fase crescente' : 'Fase calante'}</b> · {Math.round(now.illumination * 100)}% illuminata · {nextText}
      </p>
    </div>
  </div>
  <details>
    <summary>Calendario di {MONTHS[month - 1]}</summary>
    <div class="grid">
      {#each ['L', 'M', 'M', 'G', 'V', 'S', 'D'] as d}<span class="h">{d}</span>{/each}
      {#each Array(offset) as _}<span></span>{/each}
      {#each days as d}
        <span class="day" class:today={d.date === today} class:main={d.name === 'piena' || d.name === 'nuova'} title={NAMES[d.name]}>
          <small>{Number(d.date.slice(8, 10))}</small>
          {d.emoji}
        </span>
      {/each}
    </div>
    <p class="legend">🌑 nuova · 🌓 primo quarto · 🌕 piena · 🌗 ultimo quarto</p>
  </details>
</section>

<style>
  section { background: linear-gradient(135deg, #fff, #f1eefc); border-radius: 24px; padding: 12px 14px; margin-bottom: 8px; }
  .top { display: flex; gap: 12px; align-items: center; }
  .emoji { font-size: 3rem; line-height: 1; }
  h2 { margin: 0; font-size: 1.1rem; }
  p { margin: 2px 0 0; font-size: 0.85rem; opacity: 0.85; }
  summary { cursor: pointer; font-size: 0.85rem; margin-top: 8px; }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-top: 8px; text-align: center; }
  .h { font-size: 0.7rem; opacity: 0.6; }
  .day { display: grid; font-size: 1.15rem; border-radius: 10px; padding: 2px 0; background: #ffffff99; }
  .day small { font-size: 0.65rem; opacity: 0.7; }
  .day.main { background: #ede7f6; font-weight: 700; }
  .day.today { outline: 2px solid var(--sole); }
  .legend { font-size: 0.75rem; text-align: center; margin-top: 8px; }
</style>
