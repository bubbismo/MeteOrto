<script lang="ts">
  import type { Climate } from '../../app/historyService'
  import { frostAfterProbability } from '../../core/climate/frostStats'
  import { monthDay } from '../format'

  let { climate, today }: { climate: Climate; today: string } = $props()

  const inSpring = $derived(Number(today.slice(5, 7)) <= 6)
  const chance = $derived(Math.round(frostAfterProbability(climate.air, today, climate.years) * 100))
  const chanceGround = $derived(Math.round(frostAfterProbability(climate.ground, today, climate.years) * 100))
  const a = $derived(climate.air)
  const g = $derived(climate.ground)
</script>

<section>
  <h2>🗓️ Le gelate nel tuo orto</h2>
  <p class="sub">Negli ultimi {climate.years} anni, dai dati storici del punto</p>
  {#if a.lastSpring}
    <div class="row"><span>Ultima gelata di primavera</span><b>di solito {monthDay(a.lastSpring.median)}</b></div>
    <div class="row sub"><span>1 anno su 10 gela dopo il</span><b>{monthDay(a.lastSpring.p90)}</b></div>
    <div class="row sub"><span>la più tardiva</span><b>{monthDay(a.lastSpring.latest)}</b></div>
  {/if}
  {#if g.lastSpring}
    <div class="row"><span>Brinate sul terreno (minima ≤ 2°)</span><b>fino al {monthDay(g.lastSpring.p90)} (1 anno su 10)</b></div>
  {/if}
  {#if a.firstAutumn}
    <div class="row"><span>Prima gelata d’autunno</span><b>di solito {monthDay(a.firstAutumn.median)}</b></div>
    <div class="row sub"><span>la più precoce</span><b>{monthDay(a.firstAutumn.earliest)}</b></div>
  {/if}
  {#if inSpring}
    <p class="now">
      {chance === 0 && chanceGround === 0
        ? 'Da oggi in poi il rischio gelo è storicamente molto basso.'
        : `Da oggi: ancora gelo in ${chance}% degli anni (brina sul terreno in ${chanceGround}%).`}
    </p>
  {/if}
</section>

<style>
  section { background: #fff; border-radius: 24px; padding: 14px; margin-top: 12px; }
  h2 { margin: 0; font-size: 1rem; }
  .sub { opacity: 0.7; font-size: 0.8rem; margin: 2px 0 8px; }
  .row { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-top: 1px solid #f3e9c8; font-size: 0.9rem; }
  .row.sub { font-size: 0.8rem; opacity: 0.8; border-top: 0; padding: 1px 0 1px 10px; }
  .row b { text-align: right; }
  .now { margin: 10px 0 0; padding: 8px 10px; border-radius: 14px; background: #e1f5fe; font-size: 0.85rem; }
</style>
