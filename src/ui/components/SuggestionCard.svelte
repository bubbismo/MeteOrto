<script lang="ts">
  import type { Suggestion } from '../../core/journal/adapt'
  import { fullDate, monthDay } from '../format'
  import { METHOD_LABEL } from '../sowingText'

  let { s, name, emoji, onapply, ondismiss }: { s: Suggestion; name: string; emoji: string; onapply: () => void; ondismiss: () => void } = $props()

  const range = (p: { from: string; to: string }) => `${monthDay(p.from)} – ${monthDay(p.to)}`
  const what = $derived(
    s.kind === 'estendi-fine'
      ? `allungare la finestra di ${METHOD_LABEL[s.method].toLowerCase()} fino al ${monthDay(s.proposed.to)}`
      : s.kind === 'estendi-inizio'
        ? `anticipare l’inizio della ${METHOD_LABEL[s.method].toLowerCase()} al ${monthDay(s.proposed.from)}`
        : s.kind === 'ritarda-inizio'
          ? `ritardare l’inizio della ${METHOD_LABEL[s.method].toLowerCase()} al ${monthDay(s.proposed.from)}`
          : `chiudere prima la finestra di ${METHOD_LABEL[s.method].toLowerCase()}, al ${monthDay(s.proposed.to)}`,
  )
  const why = $derived(
    s.kind.startsWith('estendi') ? 'con buon raccolto, anche se fuori dal periodo della tabella' : 'con esito scarso, ai margini del periodo',
  )
</script>

<article>
  <h3>{emoji} {name}: conviene {what}</h3>
  <p>
    Finestra attuale {range(s.current)} → proposta <b>{range(s.proposed)}</b>.
  </p>
  <p class="evidence">
    Lo dicono <b>{s.seasons.length} stagioni</b> ({s.seasons.join(', ')}): semine del {s.dates.map(fullDate).join(', ')}, {why}.
  </p>
  <div class="btns">
    <button class="go" onclick={onapply}>Applica alla tabella</button>
    <button onclick={ondismiss}>Ignora</button>
  </div>
</article>

<style>
  article { background: #e8f5e9; border-radius: 20px; padding: 12px 14px; margin-top: 8px; border-left: 6px solid var(--foglia); }
  h3 { margin: 0 0 4px; font-size: 0.95rem; }
  p { margin: 3px 0; font-size: 0.85rem; }
  .evidence { opacity: 0.85; }
  .btns { display: flex; gap: 8px; margin-top: 8px; }
  button { font: inherit; font-weight: 700; font-size: 0.85rem; padding: 7px 12px; border: 0; border-radius: 12px; background: #fff; color: var(--testo); cursor: pointer; }
  .go { background: var(--foglia); color: #fff; }
</style>
