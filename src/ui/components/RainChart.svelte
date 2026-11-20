<script lang="ts">
  export interface RainDay {
    date: string
    mm: number
    kind: 'past' | 'today' | 'forecast'
  }
  let { days }: { days: RainDay[] } = $props()

  const W = 340
  const H = 130
  const PAD_T = 16
  const PAD_B = 18
  const max = $derived(Math.max(10, ...days.map((d) => d.mm)))
  const bw = $derived(W / Math.max(1, days.length))
  const y = (v: number) => H - PAD_B - (v / max) * (H - PAD_B - PAD_T)
  const color = { past: '#4fc3f7', today: '#0288d1', forecast: '#b3e5fc' }
</script>

<figure>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="Pioggia giornaliera">
    <rect width={W} height={H} rx="16" fill="#fff" />
    {#each [0.5, 1] as f}
      <line x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} stroke="#e6eef3" />
    {/each}
    <text x="6" y={PAD_T - 4} font-size="9" fill="#6b8190">{Math.round(max)} mm</text>
    {#each days as d, i}
      {#if d.mm > 0.05}
        <rect class="bar" style="--i:{i}" x={i * bw + 1} y={y(d.mm)} width={Math.max(1, bw - 2)} height={H - PAD_B - y(d.mm)} rx="2" fill={color[d.kind]} stroke={d.kind === 'forecast' ? '#4fc3f7' : 'none'} stroke-dasharray="3 2" />
      {/if}
    {/each}
    {#each days as d, i}
      {#if d.kind === 'today'}
        <line x1={i * bw + bw / 2} x2={i * bw + bw / 2} y1={PAD_T} y2={H - PAD_B} stroke="#ffb627" stroke-width="2" stroke-dasharray="3 3" />
        <text x={i * bw + bw / 2} y={H - 5} text-anchor="middle" font-size="9" font-weight="700" fill="#7a4a00">oggi</text>
      {/if}
    {/each}
    <line x1="0" x2={W} y1={H - PAD_B} y2={H - PAD_B} stroke="#b0c4d0" />
  </svg>
  <figcaption>
    <span><i style="background:#4fc3f7"></i>caduta</span>
    <span><i style="background:#b3e5fc;border:1px dashed #4fc3f7"></i>prevista</span>
  </figcaption>
</figure>

<style>
  figure { margin: 0; }
  .bar { transform-box: fill-box; transform-origin: bottom; animation: grow 0.7s var(--ease) both; animation-delay: calc(var(--i) * 22ms + 150ms); }
  @keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  svg { width: 100%; height: auto; display: block; }
  figcaption { display: flex; gap: 14px; font-size: 0.75rem; opacity: 0.85; margin-top: 6px; }
  span { display: inline-flex; align-items: center; gap: 5px; }
  i { display: inline-block; width: 14px; height: 10px; border-radius: 3px; }
</style>
