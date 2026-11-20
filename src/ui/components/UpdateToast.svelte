<script lang="ts">
  import { pwaUpdate } from '../../app/pwaUpdate.svelte'
  import { saveNav } from '../../app/navState'

  let hidden = $state(false)
  function update() {
    saveNav({}) // keep the position fresh so the reload brings the person back here
    pwaUpdate.apply()
  }
</script>

{#if pwaUpdate.ready && !hidden}
  <div class="toast" role="status">
    <span>🌱 È pronta una nuova versione</span>
    <button class="go" onclick={update}>Aggiorna</button>
    <button class="later" onclick={() => (hidden = true)} aria-label="Più tardi">✕</button>
  </div>
{/if}

<style>
  .toast { position: fixed; left: 12px; right: 12px; bottom: calc(68px + env(safe-area-inset-bottom)); z-index: 5; max-width: 536px; margin: 0 auto; display: flex; align-items: center; gap: 8px; background: #263238; color: #fff; border-radius: 18px; padding: 10px 12px 10px 16px; box-shadow: 0 6px 20px #0004; animation: rise 0.5s var(--ease) both; }
  span { flex: 1; font-size: 0.9rem; }
  button { font: inherit; font-weight: 700; border: 0; border-radius: 12px; padding: 7px 14px; cursor: pointer; }
  .go { background: var(--sole); color: var(--testo); }
  .later { background: #ffffff22; color: #fff; padding: 7px 10px; }
</style>
