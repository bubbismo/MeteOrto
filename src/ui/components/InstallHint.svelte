<script lang="ts">
  import { onMount } from 'svelte'

  const KEY = 'meteorto.installHint'
  const seen = () => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  }

  let dismissed = $state(seen())
  let prompt = $state<any>(null)
  const standalone = typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const show = $derived(!standalone && !dismissed && (ios || prompt))

  onMount(() => {
    const on = (e: Event) => {
      e.preventDefault()
      prompt = e
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  })

  function close() {
    dismissed = true
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // ignore
    }
  }
  async function install() {
    prompt?.prompt()
    await prompt?.userChoice
    close()
  }
</script>

{#if show}
  <aside>
    <span class="ic">🏡</span>
    <div>
      <b>Tienila sempre a portata di mano</b>
      {#if prompt}
        <p>Installa MeteOrto: si apre come una vera app, anche offline.</p>
        <div class="btns"><button class="go" onclick={install}>Installa</button><button onclick={close}>Non ora</button></div>
      {:else}
        <p>Tocca <b>Condividi</b> ⬆️ e poi <b>Aggiungi alla schermata Home</b>.</p>
        <div class="btns"><button onclick={close}>Ho capito</button></div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  aside { display: flex; gap: 12px; background: #fff; border: 2px dashed var(--sole); border-radius: 22px; padding: 12px 14px; margin-top: 14px; animation: rise 0.6s var(--ease) both; }
  .ic { font-size: 2rem; animation: bob 2.6s ease-in-out infinite; }
  p { margin: 3px 0 8px; font-size: 0.88rem; }
  .btns { display: flex; gap: 8px; }
  button { font: inherit; font-weight: 700; font-size: 0.85rem; padding: 7px 14px; border: 0; border-radius: 12px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  .go { background: var(--sole); }
  @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
</style>
