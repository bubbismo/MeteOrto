<script lang="ts">
  import type { Insights } from '../../app/insights'
  import TasksCard from '../components/TasksCard.svelte'

  let { insights, waxing }: { insights: Insights; waxing: boolean } = $props()

  const now = $derived(insights.tasks.filter((t) => t.status === 'ora'))
  const soon = $derived(insights.tasks.filter((t) => t.status === 'presto'))
</script>

<TasksCard items={now} {waxing} title="In questo periodo" />
{#if soon.length}<TasksCard items={soon} {waxing} title="Nelle prossime due settimane" />{/if}
<p class="note">
  I lavori sono in <code>src/data/lavori.json</code>. Le mattine adatte arrivano dalle previsioni: asciutte, con poco vento e senza pioggia subito dopo.
</p>

<style>
  .note { font-size: 0.8rem; opacity: 0.7; margin: 10px 4px; }
</style>
