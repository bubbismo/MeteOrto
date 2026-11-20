<script lang="ts">
  import { METHODS, isModified, type Crop, type FrostSensitivity, type Method, type MoonPref, type Period, type UserCrops } from '../../core/sowing/crops'
  import MonthDayInput from '../components/MonthDayInput.svelte'
  import { METHOD_LABEL } from '../sowingText'

  let {
    crops,
    user,
    onpatch,
    onreset,
    onadd,
    onremove,
    onclose,
  }: {
    crops: Crop[]
    user: UserCrops
    onpatch: (id: string, patch: Partial<Crop>) => void
    onreset: (id: string) => void
    onadd: (name: string, emoji: string) => void
    onremove: (id: string) => void
    onclose: () => void
  } = $props()

  let filter = $state('')
  let newName = $state('')
  let newEmoji = $state('🌱')

  const shown = $derived(crops.filter((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase())))
  const num = (e: Event, fallback = 0) => {
    const v = Number((e.currentTarget as HTMLInputElement).value)
    return Number.isFinite(v) ? v : fallback
  }

  function setPeriods(c: Crop, m: Method, list: Period[]) {
    const periods = { ...c.periods }
    if (list.length) periods[m] = list
    else delete periods[m]
    onpatch(c.id, { periods })
  }
  function setPeriod(c: Crop, m: Method, i: number, key: 'from' | 'to', v: string) {
    const list = (c.periods[m] ?? []).map((p, j) => (j === i ? { ...p, [key]: v } : p))
    setPeriods(c, m, list)
  }
  const addPeriod = (c: Crop, m: Method) => setPeriods(c, m, [...(c.periods[m] ?? []), { from: '04-01', to: '06-30' }])
  const removePeriod = (c: Crop, m: Method, i: number) => setPeriods(c, m, (c.periods[m] ?? []).filter((_, j) => j !== i))
  const pair = (a: [number, number], i: 0 | 1, v: number): [number, number] => (i === 0 ? [v, a[1]] : [a[0], v])

  function submitNew(e: Event) {
    e.preventDefault()
    if (!newName.trim()) return
    onadd(newName.trim(), newEmoji.trim())
    newName = ''
  }
</script>

<button class="back" onclick={onclose}>← Torna all’orto</button>
<h2>Tabella delle colture</h2>
<p class="note">Le modifiche restano solo su questo dispositivo. Con “Ripristina” torni ai valori originali.</p>

<form class="add" onsubmit={submitNew}>
  <input class="emoji" bind:value={newEmoji} maxlength="4" aria-label="Icona" />
  <input bind:value={newName} placeholder="Aggiungi una coltura…" />
  <button type="submit">Aggiungi</button>
</form>
<input class="search" bind:value={filter} placeholder="🔎 Cerca una coltura" />

{#each shown as c (c.id)}
  <details>
    <summary>
      <span class="e">{c.emoji}</span><b>{c.name}</b>
      {#if c.custom}<i>tua</i>{:else if isModified(c.id, user)}<i>modificata</i>{/if}
    </summary>

    <div class="body">
      {#each METHODS as m}
        <div class="block">
          <h3>{METHOD_LABEL[m]}</h3>
          {#each c.periods[m] ?? [] as p, i}
            <div class="period">
              <MonthDayInput value={p.from} label="Dal" onchange={(v) => setPeriod(c, m, i, 'from', v)} />
              <span>→</span>
              <MonthDayInput value={p.to} label="Al" onchange={(v) => setPeriod(c, m, i, 'to', v)} />
              <button class="x" onclick={() => removePeriod(c, m, i)} aria-label="Togli periodo">✕</button>
            </div>
          {/each}
          <button class="plus" onclick={() => addPeriod(c, m)}>+ periodo</button>
        </div>
      {/each}

      <div class="fields">
        <label>Terreno minimo (°C)
          <input type="number" step="0.5" value={c.soilTempMin} onchange={(e) => onpatch(c.id, { soilTempMin: num(e, c.soilTempMin) })} />
        </label>
        <label>Gelo
          <select value={c.frost} onchange={(e) => onpatch(c.id, { frost: e.currentTarget.value as FrostSensitivity })}>
            <option value="resistente">resiste</option>
            <option value="tollerante">tollera il freddo leggero</option>
            <option value="sensibile">teme il gelo</option>
          </select>
        </label>
        <label>Luna (tradizione)
          <select value={c.moon} onchange={(e) => onpatch(c.id, { moon: e.currentTarget.value as MoonPref })}>
            <option value="indifferente">indifferente</option>
            <option value="crescente">crescente</option>
            <option value="calante">calante</option>
          </select>
        </label>
        <label>Profondità (cm)
          <input type="number" step="0.5" min="0" value={c.depthCm} onchange={(e) => onpatch(c.id, { depthCm: num(e, c.depthCm) })} />
        </label>
        <label>Tra le file (cm)
          <input type="number" min="0" value={c.spacingCm[0]} onchange={(e) => onpatch(c.id, { spacingCm: pair(c.spacingCm, 0, num(e)) })} />
        </label>
        <label>Sulla fila (cm)
          <input type="number" min="0" value={c.spacingCm[1]} onchange={(e) => onpatch(c.id, { spacingCm: pair(c.spacingCm, 1, num(e)) })} />
        </label>
        <label>Germinazione, da (gg)
          <input type="number" min="0" value={c.germinationDays[0]} onchange={(e) => onpatch(c.id, { germinationDays: pair(c.germinationDays, 0, num(e)) })} />
        </label>
        <label>a (gg)
          <input type="number" min="0" value={c.germinationDays[1]} onchange={(e) => onpatch(c.id, { germinationDays: pair(c.germinationDays, 1, num(e)) })} />
        </label>
        <label>Raccolta, da (gg)
          <input type="number" min="0" value={c.harvestDays[0]} onchange={(e) => onpatch(c.id, { harvestDays: pair(c.harvestDays, 0, num(e)) })} />
        </label>
        <label>a (gg)
          <input type="number" min="0" value={c.harvestDays[1]} onchange={(e) => onpatch(c.id, { harvestDays: pair(c.harvestDays, 1, num(e)) })} />
        </label>
      </div>
      <label class="notes">Note
        <textarea rows="2" value={c.notes ?? ''} onchange={(e) => onpatch(c.id, { notes: e.currentTarget.value })}></textarea>
      </label>

      <div class="actions">
        {#if c.custom}
          <button class="danger" onclick={() => onremove(c.id)}>Elimina coltura</button>
        {:else if isModified(c.id, user)}
          <button onclick={() => onreset(c.id)}>↩︎ Ripristina originale</button>
        {/if}
      </div>
    </div>
  </details>
{:else}
  <p class="note">Nessuna coltura trovata.</p>
{/each}

<style>
  .back { background: none; border: 0; font: inherit; font-weight: 700; cursor: pointer; padding: 4px 0; color: inherit; }
  h2 { margin: 8px 4px; font-size: 1.15rem; }
  .note { font-size: 0.85rem; opacity: 0.75; margin: 4px; }
  .add { display: grid; grid-template-columns: 56px 1fr auto; gap: 8px; margin: 12px 0 8px; }
  input, select, textarea { font: inherit; padding: 8px 10px; border: 2px solid var(--pesca); border-radius: 12px; background: #fff; color: inherit; min-width: 0; }
  .emoji { text-align: center; }
  .search { width: 100%; margin-bottom: 10px; }
  button { font: inherit; font-weight: 700; padding: 8px 12px; border: 0; border-radius: 12px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  details { background: #fff; border-radius: 18px; margin-top: 8px; }
  summary { cursor: pointer; padding: 10px 14px; display: flex; align-items: center; gap: 8px; }
  .e { font-size: 1.4rem; }
  i { font-size: 0.7rem; background: #fff3cd; border-radius: 8px; padding: 1px 8px; font-style: normal; }
  .body { padding: 0 14px 14px; display: grid; gap: 10px; }
  .block h3 { margin: 0 0 4px; font-size: 0.85rem; opacity: 0.75; }
  .period { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
  .x { padding: 4px 9px; background: #fde0dc; }
  .plus { padding: 4px 10px; font-size: 0.8rem; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  label { display: grid; gap: 3px; font-size: 0.78rem; opacity: 0.9; }
  .notes { grid-column: 1 / -1; }
  textarea { resize: vertical; }
  .actions { display: flex; gap: 8px; }
  .danger { background: #fde0dc; }
</style>
