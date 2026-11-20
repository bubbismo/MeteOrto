<script lang="ts">
  import type { IrrigationAdvice } from '../../core/irrigation/irrigation'
  import { mm } from '../format'

  let { advice }: { advice: IrrigationAdvice } = $props()

  const head = $derived(
    advice.action === 'annaffia'
      ? { icon: '💧', title: advice.urgent ? 'Annaffia oggi: serve' : 'Annaffia oggi', cls: 'water' }
      : advice.action === 'aspetta'
        ? { icon: '⏳', title: 'Aspetta: arriva pioggia', cls: 'wait' }
        : { icon: '✅', title: 'Non serve annaffiare', cls: 'ok' },
  )
  const detail = $derived(
    advice.reason === 'terreno-asciutto'
      ? `Terreno asciutto · circa ${advice.suggestedMm} mm, meglio la sera o all’alba`
      : advice.reason === 'pioggia-in-arrivo'
        ? `${mm(advice.rainNext48)} mm previsti nelle prossime 48 ore`
        : advice.reason === 'freddo'
          ? 'Giornata fredda: le piante consumano poca acqua'
          : 'Il terreno è ancora umido',
  )
</script>

<section class={head.cls}>
  <div class="icon">{head.icon}</div>
  <div class="body">
    <h2>{head.title}</h2>
    <p>{detail}</p>
    <div class="bar" title="Umidità stimata del terreno"><i style="width:{advice.moisturePct}%"></i></div>
    <small>umidità terreno ~{advice.moisturePct}% · piovuti {mm(advice.rainLast7)} mm in 7 giorni</small>
  </div>
</section>

<style>
  section { display: flex; gap: 12px; background: #fff; border-radius: 24px; padding: 14px; margin-top: 8px; }
  section.water { background: #e1f5fe; }
  section.wait { background: #fff8e1; }
  section.ok { background: #e8f5e9; }
  .icon { font-size: 2.4rem; line-height: 1; }
  .body { flex: 1; }
  h2 { margin: 0; font-size: 1.1rem; }
  p { margin: 2px 0 8px; font-size: 0.9rem; }
  .bar { height: 8px; border-radius: 4px; background: #ffffffaa; overflow: hidden; }
  .bar i { display: block; height: 100%; background: linear-gradient(90deg, #4fc3f7, #29b6f6); border-radius: 4px; transform-origin: left; animation: fill 1.1s var(--ease) 0.3s both; }
  .water .icon { animation: drip 1.8s ease-in-out infinite; }
  .wait .icon { animation: tilt 2.4s ease-in-out infinite; }
  .ok .icon { animation: pop 0.7s var(--ease) both; }
  @keyframes fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes drip { 0%, 100% { transform: translateY(0) scale(1); } 40% { transform: translateY(5px) scale(0.92, 1.1); } 60% { transform: translateY(0) scale(1.05, 0.95); } }
  @keyframes tilt { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
  @keyframes pop { from { transform: scale(0) rotate(-30deg); } 70% { transform: scale(1.25); } to { transform: scale(1); } }
  small { font-size: 0.75rem; opacity: 0.75; }
</style>
