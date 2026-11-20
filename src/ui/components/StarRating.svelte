<script lang="ts">
  let { value, onchange, size = '1.6rem' }: { value?: number; onchange: (v: 1 | 2 | 3 | 4 | 5) => void; size?: string } = $props()
</script>

<span class="stars" role="radiogroup" aria-label="Qualità del raccolto">
  {#each [1, 2, 3, 4, 5] as n}
    <button type="button" role="radio" aria-checked={value === n} aria-label="{n} su 5" onclick={() => onchange(n as 1 | 2 | 3 | 4 | 5)} style:font-size={size}>
      {n <= (value ?? 0) ? '★' : '☆'}
    </button>
  {/each}
</span>

<style>
  .stars { display: inline-flex; gap: 2px; }
  button { background: none; border: 0; padding: 4px 3px; line-height: 1; cursor: pointer; color: #ff9f1c; }
</style>
