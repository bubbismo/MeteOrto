<script lang="ts">
  import type { WorkProfile, WorkWindow } from '../../core/workwindows/workwindows'
  import { dayName } from '../format'

  let { windows, today }: { windows: WorkWindow[]; today: string } = $props()

  const rows: { profile: WorkProfile; icon: string; label: string }[] = [
    { profile: 'lavori', icon: '🧑‍🌾', label: 'Lavori' },
    { profile: 'trattamenti', icon: '🧴', label: 'Trattamenti' },
    { profile: 'sfalcio', icon: '🌾', label: 'Sfalcio' },
  ]
  const forProfile = (p: WorkProfile) => windows.filter((w) => w.profile === p)
</script>

<section>
  <h2>🌤️ Mattine per lavorare fuori</h2>
  {#each rows as r}
    {@const list = forProfile(r.profile)}
    <div class="row">
      <span class="who">{r.icon} {r.label}</span>
      {#if list.length}
        <span class="when">
          {#each list.slice(0, 2) as w}
            <span class="win"><b>{dayName(w.date, w.dayIndex)}</b> {w.start}–{w.end}</span>
          {/each}
        </span>
      {:else}
        <span class="none">nessuna nei prossimi 5 giorni</span>
      {/if}
    </div>
  {/each}
</section>

<style>
  section { background: #fff; border-radius: 24px; padding: 12px 14px; margin-top: 8px; }
  h2 { margin: 0 0 6px; font-size: 1rem; }
  .row { display: grid; grid-template-columns: 112px 1fr; gap: 8px; padding: 5px 0; font-size: 0.9rem; border-top: 1px solid #f3e9c8; }
  .who { font-weight: 600; }
  .when { display: flex; flex-wrap: wrap; gap: 2px 14px; }
  .win { white-space: nowrap; }
  .none { opacity: 0.6; }
</style>
