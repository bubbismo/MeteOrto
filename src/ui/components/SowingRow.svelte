<script lang="ts">
  import type { MethodAdvice } from '../../core/sowing/sowing'
  import { monthDay } from '../format'
  import { METHOD_LABEL, advice, headline } from '../sowingText'

  /** Techniques of one crop that share the same status. */
  let { items, waxing }: { items: MethodAdvice[]; waxing: boolean } = $props()
  let open = $state(false)

  const first = $derived(items[0])
  const c = $derived(first.crop)
  const moonHint = $derived.by(() => {
    if (c.moon === 'indifferente' || (first.status !== 'ora' && first.status !== 'attenzione')) return ''
    const now = waxing ? 'crescente' : 'calante'
    return c.moon === now
      ? `🌙 Luna ${now}: favorevole, secondo la tradizione`
      : `🌙 La tradizione preferisce la luna ${c.moon} (ora è ${now})`
  })
  const FROST = { resistente: 'resiste al gelo', tollerante: 'tollera il freddo leggero', sensibile: 'teme il gelo' }
  const periods = (a: MethodAdvice) => (c.periods[a.method] ?? []).map((p) => `${monthDay(p.from)} – ${monthDay(p.to)}`).join(' · ')
  const outdoor = $derived(items.some((a) => a.method !== 'semenzaio'))
</script>

<article class={first.status}>
  <button class="head" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="emoji">{c.emoji}</span>
    <span class="txt">
      <b>{c.name}</b>
      {#each items as a}<span class="line">{headline(a)}</span>{/each}
    </span>
    <span class="chev">{open ? '▾' : '▸'}</span>
  </button>
  {#if open}
    <div class="more">
      {#each items as a}
        {@const notes = advice(a)}
        {#each notes as n}<p>{n}</p>{/each}
      {/each}
      {#if moonHint}<p class="moon">{moonHint}</p>{/if}
      <dl>
        {#each items as a}<dt>{METHOD_LABEL[a.method]}</dt><dd>{periods(a)}</dd>{/each}
        {#if outdoor}<dt>Terreno minimo</dt><dd>{c.soilTempMin}° · {FROST[c.frost]}</dd>{/if}
        {#if c.depthCm}<dt>Profondità</dt><dd>{c.depthCm} cm</dd>{/if}
        <dt>Distanze</dt><dd>{c.spacingCm[0]} cm tra le file × {c.spacingCm[1]} cm sulla fila</dd>
        {#if c.germinationDays[1]}<dt>Germinazione</dt><dd>{c.germinationDays[0]}–{c.germinationDays[1]} giorni</dd>{/if}
        <dt>Raccolta</dt><dd>dopo {c.harvestDays[0]}–{c.harvestDays[1]} giorni</dd>
      </dl>
      {#if c.notes}<p class="tip">💡 {c.notes}</p>{/if}
    </div>
  {/if}
</article>

<style>
  article { background: #fff; border-radius: 20px; margin-top: 8px; border-left: 6px solid #cfd8dc; overflow: hidden; }
  article.ora { border-left-color: var(--foglia); }
  article.attenzione { border-left-color: #ffb300; background: #fffbf0; }
  article.rimanda { border-left-color: #90a4ae; }
  article.presto { border-left-color: var(--cielo); }
  .head { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; background: none; border: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
  .emoji { font-size: 1.9rem; }
  .txt { flex: 1; display: grid; gap: 1px; }
  .line { font-size: 0.85rem; opacity: 0.85; }
  .chev { opacity: 0.5; }
  .more { padding: 0 14px 12px; font-size: 0.88rem; }
  .more p { margin: 6px 0; }
  .moon { opacity: 0.8; }
  .tip { background: var(--crema); border-radius: 12px; padding: 6px 10px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; margin: 8px 0; }
  dt { opacity: 0.65; }
  dd { margin: 0; }
</style>
