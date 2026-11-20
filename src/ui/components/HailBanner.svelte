<script lang="ts">
  import { nextHailAlert, type HailDay, type HailResult } from '../../core/hail/hail'
  import { weekdayFull } from '../format'

  let { hail }: { hail: HailResult } = $props()

  const alerts = $derived(hail.days.filter((d) => d.level !== 'nessuno'))
  const first = $derived(nextHailAlert(hail.days))
  const others = $derived(alerts.slice(1))

  function when(d: HailDay): string {
    const wd = weekdayFull(d.date)
    const day = d.dayIndex === 0 ? 'Oggi' : d.dayIndex === 1 ? 'Domani' : wd.charAt(0).toUpperCase() + wd.slice(1)
    if (!d.window) return day
    const h = Number(d.window.from.slice(0, 2))
    const part = h < 6 ? 'di notte' : h < 12 ? 'in mattinata' : h < 18 ? 'nel pomeriggio' : 'in serata'
    return `${day} ${part}`
  }
  const lead = (d: HailDay) => (d.dayIndex >= 2 ? `tra ${d.dayIndex} giorni` : '')
  const confidence = { alta: 'previsione concorde', media: 'i modelli non sono del tutto d’accordo', bassa: 'da confermare nei prossimi aggiornamenti' }
</script>

{#if first}
  <section class="hail {first.level}" role="alert">
    <div class="sign" aria-hidden="true">
      <span class="tri">⚠️</span>
    </div>
    <div class="body">
      <p class="kicker">ALLERTA {first.level === 'arancione' ? 'ARANCIONE' : 'GIALLA'}</p>
      <h2>Grandine {first.level === 'arancione' ? 'probabile' : 'possibile'}</h2>
      <p class="main">
        <b>{when(first)}</b>{#if first.window}, <b>{first.window.from}–{first.window.to}</b>{/if}: temporali forti con rischio di grandine.
      </p>
      <p class="sub">
        {[lead(first), confidence[first.confidence], first.hailCode ? 'segnale di grandine nei modelli' : ''].filter(Boolean).join(' · ')}
      </p>
      <ul>
        <li>Copri serre e tunnel con reti antigrandine o teli resistenti</li>
        <li>Raccogli i frutti maturi e ripara le piantine delicate</li>
        <li>Metti al sicuro vasi, attrezzi leggeri e tutori</li>
        <li>Durante il temporale resta al riparo, non nell’orto</li>
      </ul>
      {#if others.length}
        <p class="more">
          Poi: {#each others as d, i}{i ? ' · ' : ''}{d.dayIndex === 1 ? 'domani' : weekdayFull(d.date)} ({d.level === 'arancione' ? 'arancione' : 'gialla'}){/each}
        </p>
      {/if}
      <p class="note">Stima dei modelli meteo, non è un’allerta ufficiale: la grandine è difficile da prevedere. Controlla anche i bollettini della tua Regione e della Protezione Civile.</p>
    </div>
  </section>
{/if}

<style>
  .hail { display: flex; gap: 12px; padding: 14px; margin-bottom: 14px; border-radius: 24px; border: 4px solid #f9a825; background: linear-gradient(180deg, #fff176, #fff9c4); animation: hailring 2.2s ease-out infinite; }
  .hail.arancione { border-color: #ef6c00; background: linear-gradient(180deg, #ffb74d, #ffe0b2); }
  @keyframes hailring { 0% { box-shadow: 0 0 0 0 #f9a82588; } 70%, 100% { box-shadow: 0 0 0 16px #f9a82500; } }
  .hail.arancione { animation-name: hailring-o; }
  @keyframes hailring-o { 0% { box-shadow: 0 0 0 0 #ef6c0088; } 70%, 100% { box-shadow: 0 0 0 16px #ef6c0000; } }

  .sign { flex: 0 0 auto; }
  .tri { display: grid; place-items: center; width: 52px; height: 52px; font-size: 2rem; background: #fff; border: 3px solid #4a3200; border-radius: 14px; animation: shake 3s ease-in-out infinite; }
  @keyframes shake { 0%, 86%, 100% { transform: rotate(0); } 89% { transform: rotate(-10deg); } 92% { transform: rotate(9deg); } 95% { transform: rotate(-6deg); } 98% { transform: rotate(3deg); } }

  .body { min-width: 0; }
  .kicker { margin: 0; font-size: 0.78rem; font-weight: 900; letter-spacing: 0.12em; }
  h2 { margin: 0 0 4px; font-size: 1.4rem; line-height: 1.15; }
  p { margin: 3px 0; }
  .main { font-size: 1.02rem; }
  .sub { font-size: 0.85rem; opacity: 0.85; }
  ul { margin: 8px 0 6px; padding-left: 18px; font-size: 0.88rem; font-weight: 600; display: grid; gap: 2px; }
  .more { font-size: 0.85rem; margin-top: 8px; font-weight: 600; }
  .note { font-size: 0.72rem; opacity: 0.75; margin-top: 8px; }
</style>
