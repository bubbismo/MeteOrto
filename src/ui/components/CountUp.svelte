<script lang="ts">
  import { untrack } from 'svelte'
  import { Tween } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'
  import { reducedMotion } from '../motion'

  let { value, suffix = '', duration = 900 }: { value: number | null; suffix?: string; duration?: number } = $props()

  const t = new Tween(0, { duration: reducedMotion() ? 0 : untrack(() => duration), easing: cubicOut })
  $effect(() => {
    if (value !== null) t.set(value)
  })
</script>

{value === null ? '–' : `${Math.round(t.current)}${suffix}`}
