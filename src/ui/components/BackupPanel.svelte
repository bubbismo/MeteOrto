<script lang="ts">
  import type { JournalStore } from '../../app/journal.svelte'
  import { makeBackup, parseBackup, parseCsv, toCsv } from '../../core/journal/backup'
  import type { Location } from '../../core/types'
  import type { UserCrops } from '../../core/sowing/crops'
  import type { SoilType } from '../../core/irrigation/irrigation'

  let {
    journal,
    userCrops,
    soil,
    location,
    onimport,
  }: {
    journal: JournalStore
    userCrops: UserCrops
    soil: SoilType
    location: Location
    onimport: (crops: UserCrops, soil: SoilType | null) => void
  } = $props()

  let message = $state('')
  let isError = $state(false)
  let input: HTMLInputElement

  function download(name: string, text: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const stamp = () => new Date().toISOString().slice(0, 10)

  function exportJson() {
    const b = makeBackup({
      journal: JSON.parse(JSON.stringify(journal.entries)),
      userCrops: JSON.parse(JSON.stringify(userCrops)),
      settings: { soil, location: { lat: location.lat, lon: location.lon, elevation: location.elevation } },
      dismissed: [...journal.dismissed],
    })
    download(`meteorto-backup-${stamp()}.json`, JSON.stringify(b, null, 1), 'application/json')
    say(`Backup salvato: ${journal.entries.length} voci del diario e le tue colture.`)
  }
  function exportCsv() {
    download(`meteorto-diario-${stamp()}.csv`, '﻿' + toCsv(journal.entries), 'text/csv;charset=utf-8')
    say(`Diario esportato: ${journal.entries.length} righe.`)
  }
  function say(m: string, error = false) {
    message = m
    isError = error
  }

  async function onfile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0]
    ;(e.currentTarget as HTMLInputElement).value = ''
    if (!file) return
    const text = await file.text()
    if (file.name.toLowerCase().endsWith('.csv')) {
      const r = parseCsv(text, location)
      if (r.entries.length === 0) return say('Nel file CSV non ho trovato voci valide.', true)
      const m = journal.merge(r.entries)
      void journal.refreshWeather(new Date().toISOString().slice(0, 10))
      return say(`Importate ${m.added} voci nuove, ${m.updated} aggiornate${r.skipped ? `, ${r.skipped} ignorate` : ''}.`)
    }
    const r = parseBackup(text)
    if (!r.ok) return say(r.error, true)
    const m = journal.merge(r.backup.journal, r.backup.dismissed)
    const merged: UserCrops = {
      overrides: { ...userCrops.overrides, ...r.backup.userCrops.overrides },
      custom: [...userCrops.custom.filter((c) => !r.backup.userCrops.custom.some((x) => x.id === c.id)), ...r.backup.userCrops.custom],
    }
    const s = r.backup.settings.soil
    onimport(merged, s === 'sabbioso' || s === 'medio' || s === 'argilloso' ? s : null)
    void journal.refreshWeather(new Date().toISOString().slice(0, 10))
    say(`Backup importato: ${m.added} voci nuove, ${m.updated} aggiornate${r.skipped ? `, ${r.skipped} ignorate` : ''}.`)
  }
</script>

<p class="note">Tutto resta sul tuo telefono. Il backup contiene diario, colture modificate e impostazioni: conservalo per non perdere nulla se cambi telefono.</p>
<div class="btns">
  <button onclick={exportJson}>⬇️ Backup completo (JSON)</button>
  <button onclick={exportCsv}>⬇️ Diario (CSV, per Excel)</button>
  <button onclick={() => input.click()}>⬆️ Importa file…</button>
</div>
<input bind:this={input} type="file" accept=".json,.csv,application/json,text/csv" onchange={onfile} hidden />
{#if message}<p class="msg" class:error={isError} role="status">{message}</p>{/if}

<style>
  .note { font-size: 0.85rem; opacity: 0.8; margin: 8px 4px; }
  .btns { display: grid; gap: 8px; }
  button { font: inherit; font-weight: 700; padding: 12px; border: 0; border-radius: 16px; background: var(--pesca); color: var(--testo); cursor: pointer; }
  .msg { margin: 10px 4px; font-size: 0.85rem; padding: 8px 12px; border-radius: 12px; background: #e8f5e9; }
  .msg.error { background: #fde0dc; }
</style>
