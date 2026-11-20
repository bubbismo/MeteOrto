<script lang="ts">
  import type { Sky } from '../../core/types'

  /** Decorative weather layer behind the hero card: rays, rain, snow, stars, drifting clouds. Pure CSS, no libraries. */
  let { sky, night }: { sky: Sky; night: boolean } = $props()

  // fixed pseudo-random layouts: stable between renders, cheap to draw
  const pick = (n: number, seed: number) => Array.from({ length: n }, (_, i) => ((i * 9301 + seed * 49297) % 233280) / 233280)
  const drops = pick(22, 3)
  const flakes = pick(16, 7)
  const stars = pick(18, 11)
  const stars2 = pick(18, 5)
</script>

<div class="fx" aria-hidden="true">
  {#if night}
    {#each stars as x, i}
      <i class="star" style="left:{x * 100}%; top:{stars2[i] * 62}%; --d:{(i % 6) * 0.6}s; --s:{1.5 + (i % 3)}px"></i>
    {/each}
  {/if}

  {#if sky === 'sun' && !night}
    <div class="sunrays"></div>
    <div class="glow"></div>
  {/if}

  {#if sky === 'partly' || sky === 'cloudy' || sky === 'fog'}
    <div class="cloud c1"></div>
    <div class="cloud c2"></div>
  {/if}

  {#if sky === 'rain' || sky === 'storm'}
    <div class="cloud c1 dark"></div>
    {#each drops as x, i}
      <i class="drop" style="left:{x * 100}%; --d:{(i % 7) * 0.17}s; --t:{0.75 + (i % 5) * 0.09}s"></i>
    {/each}
  {/if}
  {#if sky === 'storm'}<div class="flash"></div>{/if}

  {#if sky === 'snow'}
    {#each flakes as x, i}
      <i class="flake" style="left:{x * 100}%; --d:{(i % 8) * 0.55}s; --t:{4 + (i % 4)}s; --s:{3 + (i % 3) * 1.5}px"></i>
    {/each}
  {/if}
</div>

<style>
  .fx { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }

  /* ---- stars ---- */
  .star { position: absolute; width: var(--s); height: var(--s); border-radius: 50%; background: #fff; opacity: 0.8; animation: twinkle 3.2s ease-in-out infinite; animation-delay: var(--d); }
  @keyframes twinkle { 0%, 100% { opacity: 0.25; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

  /* ---- sun ---- */
  .sunrays {
    position: absolute; top: -90px; left: 50%; width: 420px; height: 420px; margin-left: -210px; opacity: 0.55;
    background: repeating-conic-gradient(from 0deg, #fff7c4 0deg 9deg, transparent 9deg 22deg);
    -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 68%); mask-image: radial-gradient(circle, #000 0%, transparent 68%);
    animation: spin 70s linear infinite;
  }
  .glow { position: absolute; top: 12px; left: 50%; width: 220px; height: 220px; margin-left: -110px; border-radius: 50%; background: radial-gradient(circle, #fff6b8cc, transparent 65%); animation: pulse 5s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { transform: scale(0.94); opacity: 0.8; } 50% { transform: scale(1.08); opacity: 1; } }

  /* ---- clouds ---- */
  /* a cloud is a flat base with two soft bumps */
  .cloud { --c: #ffffffc8; position: absolute; width: 150px; height: 40px; border-radius: 40px; background: var(--c); filter: blur(5px); }
  .cloud::before, .cloud::after { content: ''; position: absolute; border-radius: 50%; background: var(--c); }
  .cloud::before { width: 58px; height: 58px; left: 24px; top: -26px; }
  .cloud::after { width: 74px; height: 74px; left: 62px; top: -38px; }
  .cloud.c1 { top: 44px; left: -190px; animation: pass 42s linear infinite; }
  .cloud.c2 { top: 120px; left: -190px; transform: scale(0.7); opacity: 0.8; animation: pass 58s linear -26s infinite; }
  .cloud.dark { --c: #8ea0aacc; }
  @keyframes pass { to { translate: 680px 0; } }

  /* ---- rain ---- */
  .drop { position: absolute; top: -20px; width: 2px; height: 16px; border-radius: 2px; background: linear-gradient(#4fc3f700, #4fc3f7cc); transform: rotate(12deg); animation: rain var(--t) linear infinite; animation-delay: var(--d); }
  @keyframes rain { to { transform: translate(-26px, 380px) rotate(12deg); } }
  .flash { position: absolute; inset: 0; background: #fff; opacity: 0; animation: lightning 6s linear infinite; }
  @keyframes lightning { 0%, 91%, 100% { opacity: 0; } 92% { opacity: 0.55; } 93.5% { opacity: 0; } 95% { opacity: 0.4; } 97% { opacity: 0; } }

  /* ---- snow ---- */
  .flake { position: absolute; top: -10px; width: var(--s); height: var(--s); border-radius: 50%; background: #fff; box-shadow: 0 0 4px #9ad7f7; animation: snowfall var(--t) linear infinite; animation-delay: var(--d); }
  @keyframes snowfall { 0% { transform: translate(0, 0); } 50% { transform: translate(14px, 190px); } 100% { transform: translate(-6px, 380px); } }
</style>
