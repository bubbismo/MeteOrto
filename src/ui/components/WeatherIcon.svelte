<script lang="ts">
  import type { Sky } from '../../core/types'

  let { sky, night = false, size = 64 }: { sky: Sky; night?: boolean; size?: number } = $props()
</script>

<svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={sky}>
  {#snippet cloud(fill: string, dy: number = 0)}
    <g transform={`translate(0 ${dy})`} fill={fill}>
      <circle cx="22" cy="38" r="10" />
      <circle cx="36" cy="31" r="13" />
      <circle cx="49" cy="39" r="9" />
      <rect x="14" y="38" width="43" height="11" rx="5.5" />
    </g>
  {/snippet}
  {#snippet sunBody(cx: number, cy: number, r: number, face: boolean)}
    <g stroke="#ff9f1c" stroke-width="3.5" stroke-linecap="round">
      {#each [0, 45, 90, 135, 180, 225, 270, 315] as a}
        <line x1={cx + Math.cos((a * Math.PI) / 180) * (r + 5)} y1={cy + Math.sin((a * Math.PI) / 180) * (r + 5)}
              x2={cx + Math.cos((a * Math.PI) / 180) * (r + 10)} y2={cy + Math.sin((a * Math.PI) / 180) * (r + 10)} />
      {/each}
    </g>
    <circle {cx} {cy} {r} fill="#ffb627" />
    {#if face}
      <circle cx={cx - r * 0.35} cy={cy - r * 0.1} r="2" fill="#7a4a00" />
      <circle cx={cx + r * 0.35} cy={cy - r * 0.1} r="2" fill="#7a4a00" />
      <path d={`M${cx - r * 0.4} ${cy + r * 0.25} q${r * 0.4} ${r * 0.4} ${r * 0.8} 0`} fill="none" stroke="#7a4a00" stroke-width="2.2" stroke-linecap="round" />
    {/if}
  {/snippet}
  {#snippet moon(cx: number, cy: number, r: number)}
    <circle {cx} {cy} {r} fill="#ffe08a" />
    <circle cx={cx + r * 0.5} cy={cy - r * 0.3} r={r * 0.85} fill="var(--moon-cut, #fff7e0)" />
  {/snippet}

  {#if sky === 'sun'}
    {#if night}{@render moon(32, 32, 16)}{:else}{@render sunBody(32, 32, 14, true)}{/if}
  {:else if sky === 'partly'}
    {#if night}{@render moon(24, 22, 11)}{:else}{@render sunBody(24, 24, 10, false)}{/if}
    {@render cloud('#ffffff', 6)}
    <g fill="none" stroke="#cfd8dc" stroke-width="1.5"><path d="M16 49h41" /></g>
  {:else if sky === 'cloudy'}
    {@render cloud('#cfd8dc', -2)}
    {@render cloud('#ffffff', 6)}
  {:else if sky === 'rain'}
    {@render cloud('#b0bec5', -4)}
    <g stroke="#4fc3f7" stroke-width="3.5" stroke-linecap="round">
      <line x1="22" y1="48" x2="19" y2="57" /><line x1="33" y1="48" x2="30" y2="57" /><line x1="44" y1="48" x2="41" y2="57" />
    </g>
  {:else if sky === 'storm'}
    {@render cloud('#90a4ae', -4)}
    <path d="M34 42 L26 54 H33 L29 63 L41 49 H34 L38 42 Z" fill="#ffb627" stroke="#ff9f1c" stroke-width="1" />
  {:else if sky === 'snow'}
    {@render cloud('#cfd8dc', -4)}
    <g fill="#81d4fa"><circle cx="22" cy="53" r="2.6" /><circle cx="33" cy="57" r="2.6" /><circle cx="44" cy="53" r="2.6" /></g>
  {:else}
    {@render cloud('#cfd8dc', -6)}
    <g stroke="#b0bec5" stroke-width="3.5" stroke-linecap="round"><line x1="14" y1="50" x2="50" y2="50" /><line x1="20" y1="57" x2="56" y2="57" /></g>
  {/if}
</svg>
