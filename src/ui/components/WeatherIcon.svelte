<script lang="ts">
  import type { Sky } from '../../core/types'

  /** `animated` makes the icon alive (rotating rays, drifting clouds, falling drops): used for the big icons only. */
  let { sky, night = false, size = 64, animated = false }: { sky: Sky; night?: boolean; size?: number; animated?: boolean } = $props()

  // unique mask id per icon, so several moons on the page never clash
  const uid = Math.random().toString(36).slice(2, 8)
</script>

<svg class:anim={animated} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={sky}>
  {#snippet cloud(fill: string, dy: number = 0, cls: string = '')}
    <g class={cls}>
      <g transform={`translate(0 ${dy})`} fill={fill}>
        <circle cx="22" cy="38" r="10" />
        <circle cx="36" cy="31" r="13" />
        <circle cx="49" cy="39" r="9" />
        <rect x="14" y="38" width="43" height="11" rx="5.5" />
      </g>
    </g>
  {/snippet}
  {#snippet sunBody(cx: number, cy: number, r: number, face: boolean)}
    <g class="rays" style={`transform-origin: ${cx}px ${cy}px`} stroke="#ff9f1c" stroke-width="3.5" stroke-linecap="round">
      {#each [0, 45, 90, 135, 180, 225, 270, 315] as a}
        <line x1={cx + Math.cos((a * Math.PI) / 180) * (r + 5)} y1={cy + Math.sin((a * Math.PI) / 180) * (r + 5)}
              x2={cx + Math.cos((a * Math.PI) / 180) * (r + 10)} y2={cy + Math.sin((a * Math.PI) / 180) * (r + 10)} />
      {/each}
    </g>
    <g class="disc" style={`transform-origin: ${cx}px ${cy}px`}>
      <circle {cx} {cy} {r} fill="#ffb627" />
      {#if face}
        <g class="face">
          <circle cx={cx - r * 0.35} cy={cy - r * 0.1} r="2" fill="#7a4a00" />
          <circle cx={cx + r * 0.35} cy={cy - r * 0.1} r="2" fill="#7a4a00" />
          <path d={`M${cx - r * 0.4} ${cy + r * 0.25} q${r * 0.4} ${r * 0.4} ${r * 0.8} 0`} fill="none" stroke="#7a4a00" stroke-width="2.2" stroke-linecap="round" />
        </g>
      {/if}
    </g>
  {/snippet}
  {#snippet moon(cx: number, cy: number, r: number)}
    <mask id="m{uid}{cx}{r}">
      <rect x="0" y="0" width="64" height="64" fill="#fff" />
      <circle cx={cx + r * 0.5} cy={cy - r * 0.3} r={r * 0.85} fill="#000" />
    </mask>
    <g class="moon">
      <circle {cx} {cy} {r} fill="#ffe08a" mask="url(#m{uid}{cx}{r})" />
    </g>
  {/snippet}

  {#if sky === 'sun'}
    {#if night}{@render moon(32, 32, 16)}{:else}{@render sunBody(32, 32, 14, true)}{/if}
  {:else if sky === 'partly'}
    {#if night}{@render moon(24, 22, 11)}{:else}{@render sunBody(24, 24, 10, false)}{/if}
    {@render cloud('#ffffff', 6, 'drift')}
    <g fill="none" stroke="#cfd8dc" stroke-width="1.5"><path d="M16 49h41" /></g>
  {:else if sky === 'cloudy'}
    {@render cloud('#cfd8dc', -2, 'drift back')}
    {@render cloud('#ffffff', 6, 'drift')}
  {:else if sky === 'rain'}
    {@render cloud('#b0bec5', -4, 'drift')}
    <g stroke="#4fc3f7" stroke-width="3.5" stroke-linecap="round">
      <line class="drop d1" x1="22" y1="48" x2="19" y2="57" /><line class="drop d2" x1="33" y1="48" x2="30" y2="57" /><line class="drop d3" x1="44" y1="48" x2="41" y2="57" />
    </g>
  {:else if sky === 'storm'}
    {@render cloud('#90a4ae', -4, 'drift')}
    <path class="bolt" d="M34 42 L26 54 H33 L29 63 L41 49 H34 L38 42 Z" fill="#ffb627" stroke="#ff9f1c" stroke-width="1" />
  {:else if sky === 'snow'}
    {@render cloud('#cfd8dc', -4, 'drift')}
    <g fill="#81d4fa"><circle class="flake d1" cx="22" cy="53" r="2.6" /><circle class="flake d2" cx="33" cy="57" r="2.6" /><circle class="flake d3" cx="44" cy="53" r="2.6" /></g>
  {:else}
    {@render cloud('#cfd8dc', -6, 'drift')}
    <g stroke="#b0bec5" stroke-width="3.5" stroke-linecap="round"><line class="mist m1" x1="14" y1="50" x2="50" y2="50" /><line class="mist m2" x1="20" y1="57" x2="56" y2="57" /></g>
  {/if}
</svg>

<style>
  svg { overflow: visible; }
  .rays, .disc, .drift, .drop, .flake, .bolt, .mist, .moon { transform-box: view-box; }

  .anim .rays { animation: spin 28s linear infinite; }
  .anim .disc { animation: breathe 4s ease-in-out infinite; }
  .anim .face { animation: blink 5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
  .anim .drift { animation: drift 7s ease-in-out infinite alternate; }
  .anim .drift.back { animation-duration: 9s; animation-direction: alternate-reverse; }
  .anim .drop { animation: fall 1.1s linear infinite; }
  .anim .flake { animation: snow 2.6s ease-in-out infinite; }
  .anim .d2 { animation-delay: 0.35s; }
  .anim .d3 { animation-delay: 0.7s; }
  .anim .bolt { animation: flash 3.2s ease-in-out infinite; transform-origin: 34px 52px; }
  .anim .mist { animation: mist 5s ease-in-out infinite alternate; }
  .anim .m2 { animation-delay: 1.2s; animation-direction: alternate-reverse; }
  .anim .moon { animation: glow 4.5s ease-in-out infinite; transform-origin: 32px 32px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
  @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
  @keyframes drift { from { transform: translateX(-2.5px); } to { transform: translateX(2.5px); } }
  @keyframes fall { 0% { transform: translateY(-4px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(7px); opacity: 0; } }
  @keyframes snow { 0% { transform: translate(-2px, -4px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(3px, 6px); opacity: 0; } }
  @keyframes flash { 0%, 62%, 100% { opacity: 1; transform: scale(1); } 66% { opacity: 0.2; } 70% { opacity: 1; transform: scale(1.12); } 74% { opacity: 0.35; } 78% { opacity: 1; transform: scale(1); } }
  @keyframes mist { from { transform: translateX(-3px); } to { transform: translateX(3px); } }
  @keyframes glow { 0%, 100% { transform: scale(1); filter: none; } 50% { transform: scale(1.04); filter: drop-shadow(0 0 3px #ffe08a); } }
</style>
