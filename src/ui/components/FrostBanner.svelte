<script lang="ts">
  import type { FrostNight } from '../../core/frost/frost'
  import { deg, weekdayFull } from '../format'

  let { nights }: { nights: FrostNight[] } = $props()

  const risky = $derived(nights.filter((n) => n.level !== 'nessuno'))
  const first = $derived(risky[0])
  const others = $derived(risky.slice(1))

  function when(n: FrostNight): string {
    if (n.dayIndex === 0) return 'Stamattina'
    if (n.dayIndex === 1) return 'Stanotte'
    if (n.dayIndex === 2) return 'Domani notte'
    return `Alba di ${weekdayFull(n.morningDate)}`
  }
  function lead(n: FrostNight): string {
    return n.dayIndex <= 1 ? '' : `tra ${n.dayIndex} giorni`
  }
  function why(n: FrostNight): string {
    const f = n.factors
    const parts = [f.clearSky && 'cielo sereno', f.calm && 'aria ferma', f.dryAir && 'aria secca'].filter(Boolean)
    return parts.length ? parts.join(', ') : 'notte fredda'
  }
  const confidence = { alta: 'previsione solida', media: 'previsione abbastanza sicura', bassa: 'da confermare nei prossimi giorni' }
</script>

{#if first}
  <section class="alert" class:probable={first.level === 'probabile'} role="alert">
    <div class="icon">{first.level === 'probabile' ? '🥶' : '❄️'}</div>
    <div class="body">
      <h2>{first.level === 'probabile' ? 'Gelata probabile' : 'Gelo possibile'}</h2>
      <p class="main">
        <b>{when(first)}</b>: minima <b>{deg(first.tMinAir)}</b> · sul terreno circa <b>{deg(first.tMinGround)}</b>
      </p>
      <p class="sub">{[lead(first), why(first), confidence[first.confidence]].filter(Boolean).join(' · ')}</p>
      <p class="tip">Proteggi le piantine: telo, tessuto non tessuto o pacciamatura.</p>
      {#if others.length}
        <p class="more">
          Poi: {#each others as n, i}{i ? ' · ' : ''}{n.dayIndex <= 2 ? when(n).toLowerCase() : weekdayFull(n.morningDate)} {deg(n.tMinAir)}{/each}
        </p>
      {/if}
    </div>
  </section>
{:else if nights.length}
  <p class="ok">✅ Nessun rischio gelo nei prossimi giorni</p>
{/if}

<style>
  .alert { display: flex; gap: 12px; background: #fff3cd; border: 3px solid #ffca28; border-radius: 24px; padding: 14px; margin-bottom: 16px; }
  .alert.probable { background: #e1f5fe; border-color: #0288d1; animation: ring 2.6s ease-out infinite; }
  @keyframes ring { 0% { box-shadow: 0 0 0 0 #0288d166; } 70%, 100% { box-shadow: 0 0 0 14px #0288d100; } }
  .icon { display: inline-block; animation: shiver 3.2s ease-in-out infinite; }
  @keyframes shiver { 0%, 86%, 100% { transform: rotate(0); } 89% { transform: rotate(-9deg); } 92% { transform: rotate(8deg); } 95% { transform: rotate(-6deg); } 98% { transform: rotate(4deg); } }
  .icon { font-size: 2.6rem; line-height: 1; }
  h2 { margin: 0 0 2px; font-size: 1.2rem; }
  p { margin: 2px 0; }
  .main { font-size: 1.05rem; }
  .sub { font-size: 0.85rem; opacity: 0.8; }
  .tip { font-size: 0.9rem; margin-top: 8px; font-weight: 600; }
  .more { font-size: 0.85rem; opacity: 0.85; margin-top: 6px; }
  .ok { background: #e8f5e9; border-radius: 16px; padding: 8px 12px; margin: 0 0 16px; font-size: 0.9rem; text-align: center; }
</style>
