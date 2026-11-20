<script lang="ts">
  let { value, onchange, label }: { value: string; onchange: (v: string) => void; label: string } = $props()

  const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
  const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  const m = $derived(Number(value.slice(0, 2)))
  const d = $derived(Number(value.slice(3, 5)))

  function emit(month: number, day: number) {
    const clamped = Math.min(day, DAYS[month - 1])
    onchange(`${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`)
  }
</script>

<span class="md" role="group" aria-label={label}>
  <select value={d} onchange={(e) => emit(m, Number(e.currentTarget.value))} aria-label="{label}, giorno">
    {#each Array(DAYS[m - 1]) as _, i}<option value={i + 1}>{i + 1}</option>{/each}
  </select>
  <select value={m} onchange={(e) => emit(Number(e.currentTarget.value), d)} aria-label="{label}, mese">
    {#each MONTHS as name, i}<option value={i + 1}>{name}</option>{/each}
  </select>
</span>

<style>
  .md { display: inline-flex; gap: 4px; }
  select { font: inherit; padding: 6px 4px; border: 2px solid var(--pesca); border-radius: 10px; background: #fff; color: inherit; }
</style>
