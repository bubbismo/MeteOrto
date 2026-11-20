<script lang="ts">
  import { loadProxyUrl, saveProxyUrl } from '../../adapters/storage/kv'
  import type { HorizonProfile, Location } from '../../core/types'
  import HorizonChart from '../components/HorizonChart.svelte'
  import LocationForm from '../components/LocationForm.svelte'

  let {
    location,
    horizon,
    onsave,
    onrecompute,
    busy,
  }: {
    location: Location
    horizon: HorizonProfile | null
    onsave: (loc: Location) => void
    onrecompute: () => void
    busy: boolean
  } = $props()

  let proxy = $state(loadProxyUrl())

  function recompute() {
    saveProxyUrl(proxy.trim())
    onrecompute()
  }
</script>

<h2>Posizione</h2>
<LocationForm {onsave} initial={location} />

<h2>Orizzonte</h2>
<HorizonChart {horizon} />
<p class="note">
  {#if !horizon}Non ancora calcolato.
  {:else if horizon.source === 'pvgis'}Profilo ufficiale PVGIS (JRC).
  {:else}Calcolato dal rilievo del terreno: considera montagne e colline, non edifici o alberi vicini.{/if}
</p>
<details>
  <summary>Usa i dati PVGIS (avanzato)</summary>
  <p class="note">Serve un piccolo proxy gratuito: vedi <code>worker/README.md</code> nel progetto.</p>
  <input bind:value={proxy} placeholder="https://meteorto-pvgis.…workers.dev" autocapitalize="off" spellcheck="false" />
</details>
<button onclick={recompute} disabled={busy}>{busy ? 'Calcolo…' : 'Ricalcola orizzonte'}</button>

<style>
  h2 { font-size: 1.05rem; margin: 20px 4px 8px; }
  .note { font-size: 0.85rem; opacity: 0.8; margin: 8px 4px; }
  input { width: 100%; font: inherit; padding: 10px; border: 2px solid var(--pesca); border-radius: 14px; background: #fff; color: inherit; }
  button { margin-top: 10px; width: 100%; font: inherit; font-weight: 700; padding: 12px; border: 0; border-radius: 16px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  button:disabled { opacity: 0.6; }
  summary { cursor: pointer; font-size: 0.9rem; margin: 8px 4px; }
</style>
