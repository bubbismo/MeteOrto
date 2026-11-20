<script lang="ts">
  import type { TaskAdvice, TaskCategory } from '../../core/lavori/lavori'
  import { dayName, deg, weekdayFull } from '../format'

  let { items, waxing, title = '🧰 Lavori del periodo', limit }: { items: TaskAdvice[]; waxing: boolean; title?: string; limit?: number } = $props()

  const ICON: Record<TaskCategory, string> = {
    pianificazione: '📝',
    manutenzione: '🛠️',
    concimazione: '🪱',
    semenzaio: '🌱',
    terreno: '⛏️',
    semina: '🌰',
    trapianto: '🪴',
    difesa: '🛡️',
    raccolto: '🧺',
  }
  const shown = $derived(limit ? items.slice(0, limit) : items)

  function frostText(a: TaskAdvice): string {
    const f = a.frost!
    const when = f.dayIndex === 0 ? 'stamattina' : f.dayIndex === 1 ? 'stanotte' : weekdayFull(f.morningDate)
    return `Gelo ${f.level === 'probabile' ? 'probabile' : 'possibile'} ${when} (minima ${deg(f.tMinAir)}): ${a.task.category === 'raccolto' ? 'raccogli prima' : 'proteggi o rimanda'}`
  }
  function moonText(a: TaskAdvice): string {
    const m = a.task.moon
    if (!m) return ''
    const now = waxing ? 'crescente' : 'calante'
    return m === now ? `🌙 luna ${now}: va bene, secondo la tradizione` : `🌙 la tradizione preferisce la luna ${m}`
  }
</script>

<section>
  {#if title}<h2>{title}</h2>{/if}
  {#each shown as a (a.task.id)}
    <article class:soon={a.status === 'presto'}>
      <span class="ic">{ICON[a.task.category]}</span>
      <div>
        <b>{a.task.title}</b>
        {#if a.status === 'presto'}<span class="tag">tra {a.startsIn} giorni</span>{/if}
        {#if a.task.detail}<p class="d">{a.task.detail}</p>{/if}
        {#if a.frost}<p class="warn">⚠️ {frostText(a)}</p>{/if}
        {#if a.window}
          <p class="ok">🌤️ Mattina adatta: <b>{dayName(a.window.date, a.window.dayIndex)}</b> {a.window.start}–{a.window.end}</p>
        {:else if a.noWindow}
          <p class="wait">☁️ Nessuna mattina adatta nei prossimi 5 giorni</p>
        {/if}
        {#if moonText(a)}<p class="moon">{moonText(a)}</p>{/if}
      </div>
    </article>
  {:else}
    <p class="empty">Nessun lavoro in programma per questo periodo.</p>
  {/each}
</section>

<style>
  section { background: #fff; border-radius: 24px; padding: 12px 14px; margin-top: 8px; }
  h2 { margin: 0 0 4px; font-size: 1rem; }
  article { display: flex; gap: 10px; padding: 8px 0; border-top: 1px solid #f3e9c8; }
  article.soon { opacity: 0.8; }
  .ic { font-size: 1.5rem; line-height: 1.2; }
  p { margin: 3px 0 0; font-size: 0.85rem; }
  .d { opacity: 0.8; }
  .ok { color: #2e7d32; }
  .wait { opacity: 0.7; }
  .warn { background: #fff3cd; border-radius: 10px; padding: 3px 8px; }
  .moon { opacity: 0.75; font-size: 0.8rem; }
  .tag { font-size: 0.7rem; background: var(--pesca); border-radius: 8px; padding: 1px 8px; margin-left: 6px; }
  .empty { opacity: 0.7; }
</style>
