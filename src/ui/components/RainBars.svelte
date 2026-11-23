<script lang="ts">
  import { intensity, niceAxis, type RainKind } from '../../core/rain/rain'
  import { mm as fmt } from '../format'

  export interface Bar {
    key: string
    /** Spoken/long label, e.g. "Sab 22 nov". */
    label: string
    mm: number
    kind: RainKind
    /** Today only: rain expected for the whole day. */
    expectedMm?: number
    /** Short text under the bar ("" for none). */
    tick?: string
    /** No data for this slot: nothing is drawn. */
    missing?: boolean
    /** Typical value (months): drawn as a marker. */
    avg?: number
  }

  let {
    bars,
    selected = null,
    onselect,
    labelAll = false,
  }: { bars: Bar[]; selected?: string | null; onselect: (key: string) => void; labelAll?: boolean } = $props()

  const W = 360
  const H = 210
  const L = 40
  const R = 6
  const T = 28
  const B = 28
  const plotW = W - L - R
  const plotH = H - T - B

  const top = $derived(Math.max(0, ...bars.map((b) => Math.max(b.mm, b.expectedMm ?? 0, b.avg ?? 0))))
  const axis = $derived(niceAxis(top, 4))
  const y = (v: number) => T + plotH - (v / axis.max) * plotH
  const slot = $derived(plotW / Math.max(1, bars.length))
  const bw = $derived(Math.max(3, Math.min(30, slot * 0.7)))
  const gridValues = $derived(Array.from({ length: Math.floor(axis.max / axis.step + 0.001) }, (_, i) => (i + 1) * axis.step))

  const COLOR = { trace: '#b6dff2', debole: '#4fc3f7', moderata: '#0288d1', forte: '#01579b' } as const

  // value labels: all of them for few bars, otherwise the three wettest days, never on neighbouring bars
  const labeled = $derived.by(() => {
    const out = new Set<number>()
    if (labelAll) {
      bars.forEach((b, i) => b.mm >= 0.5 && out.add(i))
      return out
    }
    const order = bars.map((b, i) => ({ i, mm: b.mm })).filter((x) => x.mm >= 1).sort((a, b) => b.mm - a.mm)
    for (const c of order) {
      if (out.size >= 3) break
      if ([...out].every((j) => Math.abs(j - c.i) >= 3)) out.add(c.i)
    }
    return out
  })

  const cx = (i: number) => L + i * slot + slot / 2
</script>

<svg viewBox="0 0 {W} {H}" role="group" aria-label="Grafico della pioggia">
  <rect width={W} height={H} rx="16" fill="#fff" />

  <!-- horizontal grid with the amounts written on it -->
  {#each gridValues as g}
    <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e3edf3" />
    <text x={L - 5} y={y(g) + 4} text-anchor="end" class="axis">{g}</text>
  {/each}
  <text x="6" y="14" class="unit">mm</text>
  <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#9fb6c4" />

  {#each bars as b, i}
    {@const x = L + i * slot + (slot - bw) / 2}
    {#if selected === b.key}
      <rect x={L + i * slot} y={T - 4} width={slot} height={plotH + 4} rx="4" fill="#fff0c2" />
    {/if}
    {#if !b.missing}
      {#if b.mm > 0.04}
        <rect
          class="bar" class:forecast={b.kind === 'forecast'} class:today={b.kind === 'today'}
          style="--i:{i}" x={x} y={y(b.mm)} width={bw} height={Math.max(2, y(0) - y(b.mm))} rx="2"
          fill={COLOR[intensity(b.mm)]}
        />
      {:else}
        <rect x={x} y={y(0) - 2} width={bw} height="2" rx="1" fill="#cfd8dc" />
      {/if}
      {#if b.kind === 'today' && b.expectedMm !== undefined && b.expectedMm > b.mm}
        <rect x={x} y={y(b.expectedMm)} width={bw} height={Math.max(1, y(b.mm) - y(b.expectedMm))} rx="2" class="expected" />
      {/if}
      {#if b.avg !== undefined && b.avg > 0}
        <line x1={x - 3} x2={x + bw + 3} y1={y(b.avg)} y2={y(b.avg)} class="avg" />
      {/if}
    {/if}
    {#if labeled.has(i)}
      <text x={cx(i)} y={y(Math.max(b.mm, b.expectedMm ?? 0, b.avg ?? 0)) - 5} text-anchor="middle" class="val">{fmt(b.mm)}</text>
    {/if}
    {#if b.tick}
      <text x={cx(i)} y={H - 9} text-anchor="middle" class="tick" class:now={b.kind === 'today'}>{b.tick}</text>
      <line x1={cx(i)} x2={cx(i)} y1={y(0)} y2={y(0) + 4} stroke="#9fb6c4" />
    {/if}
    <!-- one large touch target per bar -->
    <rect
      x={L + i * slot} y={T - 4} width={slot} height={plotH + B}
      fill="transparent" role="button" tabindex="0" class="hit"
      aria-label={b.missing ? `${b.label}: nessun dato` : `${b.label}: ${fmt(b.mm)} mm`}
      onclick={() => onselect(b.key)}
      onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onselect(b.key))}
    />
  {/each}
</svg>

<style>
  svg { width: 100%; height: auto; display: block; }
  .axis { font-size: 11px; fill: #5d7a8c; }
  .unit { font-size: 11px; fill: #5d7a8c; font-weight: 700; }
  .val { font-size: 12.5px; font-weight: 800; fill: #01579b; paint-order: stroke; stroke: #fff; stroke-width: 3px; stroke-linejoin: round; }
  .tick { font-size: 11px; fill: #5d7a8c; }
  .tick.now { fill: #b45f00; font-weight: 800; }
  .bar { transform-box: fill-box; transform-origin: bottom; animation: grow 0.6s var(--ease) both; animation-delay: calc(var(--i) * 14ms); }
  .bar.forecast { opacity: 0.5; stroke: #0288d1; stroke-width: 1.2; stroke-dasharray: 3 2; }
  .bar.today { stroke: #ff9f1c; stroke-width: 1.5; }
  .expected { fill: #b3e5fc55; stroke: #ff9f1c; stroke-width: 1.2; stroke-dasharray: 3 2; }
  .avg { stroke: #ff9f1c; stroke-width: 2.6; stroke-linecap: round; }
  .hit { cursor: pointer; outline: none; }
  .hit:focus-visible { stroke: #ff9f1c; stroke-width: 2; }
  @keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
</style>
