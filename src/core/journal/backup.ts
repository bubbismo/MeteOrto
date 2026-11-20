import type { UserCrops } from '../sowing/crops'
import { METHODS, type Method } from '../sowing/crops'
import type { JournalEntry, Quality } from './types'
import { summarizeWeather } from './weather'

export const BACKUP_VERSION = 1

export interface Backup {
  app: 'MeteOrto'
  version: number
  exportedAt: string
  journal: JournalEntry[]
  userCrops: UserCrops
  settings: { soil?: string; location?: { lat: number; lon: number; elevation: number | null } | null }
  /** Suggestions the user chose to ignore. */
  dismissed: string[]
}

export function makeBackup(data: Omit<Backup, 'app' | 'version' | 'exportedAt'>, now = new Date()): Backup {
  return { app: 'MeteOrto', version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

/** Checks one entry coming from a file; returns it cleaned, or null if unusable. */
export function cleanEntry(raw: any): JournalEntry | null {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.id !== 'string' || typeof raw.cropId !== 'string' || !isDate(raw.sownOn)) return null
  if (!METHODS.includes(raw.method)) return null
  const q = Number(raw.quality)
  return {
    id: raw.id,
    cropId: raw.cropId,
    cropName: String(raw.cropName ?? raw.cropId),
    emoji: String(raw.emoji ?? '🌱'),
    method: raw.method as Method,
    sownOn: raw.sownOn,
    lat: Number(raw.lat) || 0,
    lon: Number(raw.lon) || 0,
    harvestFrom: isDate(raw.harvestFrom) ? raw.harvestFrom : undefined,
    harvestTo: isDate(raw.harvestTo) ? raw.harvestTo : undefined,
    quality: q >= 1 && q <= 5 ? (Math.round(q) as Quality) : undefined,
    notes: typeof raw.notes === 'string' && raw.notes ? raw.notes : undefined,
    weather: raw.weather && Array.isArray(raw.weather.days) ? raw.weather : undefined,
    createdAt: Number(raw.createdAt) || 0,
  }
}

export type ParseResult = { ok: true; backup: Backup; skipped: number } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let raw: any
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Il file non è un backup valido (JSON non leggibile).' }
  }
  if (raw?.app !== 'MeteOrto') return { ok: false, error: 'Questo file non è un backup di MeteOrto.' }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) return { ok: false, error: 'Backup creato da una versione più recente dell’app.' }
  const list: unknown[] = Array.isArray(raw.journal) ? raw.journal : []
  const journal = list.map(cleanEntry).filter((e): e is JournalEntry => e !== null)
  return {
    ok: true,
    skipped: list.length - journal.length,
    backup: {
      app: 'MeteOrto',
      version: raw.version,
      exportedAt: String(raw.exportedAt ?? ''),
      journal,
      userCrops: { overrides: raw.userCrops?.overrides ?? {}, custom: raw.userCrops?.custom ?? [] },
      settings: raw.settings ?? {},
      dismissed: Array.isArray(raw.dismissed) ? raw.dismissed.filter((x: unknown) => typeof x === 'string') : [],
    },
  }
}

/** Merges imported entries into the existing ones: same id = the imported one wins. */
export function mergeEntries(current: JournalEntry[], incoming: JournalEntry[]): { entries: JournalEntry[]; added: number; updated: number } {
  const map = new Map(current.map((e) => [e.id, e]))
  let added = 0
  let updated = 0
  for (const e of incoming) {
    if (map.has(e.id)) updated++
    else added++
    map.set(e.id, e)
  }
  const entries = [...map.values()].sort((a, b) => b.sownOn.localeCompare(a.sownOn) || b.createdAt - a.createdAt)
  return { entries, added, updated }
}

// ---------------------------------------------------------------- CSV

export const CSV_HEADER = [
  'id',
  'data_semina',
  'coltura_id',
  'coltura',
  'tecnica',
  'raccolto_dal',
  'raccolto_al',
  'qualita',
  'note',
  'terreno_medio_14g',
  'minima_assoluta_14g',
  'notti_gelo_14g',
  'pioggia_14g',
] as const

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const r1 = (v: number | null) => (v === null ? '' : Math.round(v * 10) / 10)

/** Journal as CSV (comma separated, UTF-8) with a short weather summary per row. */
export function toCsv(entries: JournalEntry[]): string {
  const rows = entries.map((e) => {
    const w = summarizeWeather(e.weather)
    return [
      e.id, e.sownOn, e.cropId, e.cropName, e.method, e.harvestFrom, e.harvestTo, e.quality, e.notes,
      w ? r1(w.soilMean) : '', w ? r1(w.tMinAbs) : '', w ? w.frostNights : '', w ? r1(w.rain) : '',
    ].map(esc).join(',')
  })
  return [CSV_HEADER.join(','), ...rows].join('\n') + '\n'
}

/** Splits CSV text into rows of fields (handles quotes, escaped quotes and newlines inside quotes). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const t = text.replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    if (row.some((f) => f !== '')) rows.push(row)
  }
  return rows
}

/** Reads a CSV exported by this app back into entries (weather is not in the CSV: it is downloaded again). */
export function parseCsv(text: string, fallbackPlace: { lat: number; lon: number }): { entries: JournalEntry[]; skipped: number } {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return { entries: [], skipped: 0 }
  const idx = new Map(rows[0].map((h, i) => [h.trim(), i]))
  const get = (r: string[], k: string) => r[idx.get(k) ?? -1] ?? ''
  const entries: JournalEntry[] = []
  let skipped = 0
  for (const r of rows.slice(1)) {
    const e = cleanEntry({
      id: get(r, 'id') || `csv-${get(r, 'data_semina')}-${get(r, 'coltura_id')}`,
      cropId: get(r, 'coltura_id'),
      cropName: get(r, 'coltura'),
      method: get(r, 'tecnica'),
      sownOn: get(r, 'data_semina'),
      lat: fallbackPlace.lat,
      lon: fallbackPlace.lon,
      harvestFrom: get(r, 'raccolto_dal'),
      harvestTo: get(r, 'raccolto_al'),
      quality: get(r, 'qualita'),
      notes: get(r, 'note'),
      createdAt: Date.now(),
    })
    if (e) entries.push(e)
    else skipped++
  }
  return { entries, skipped }
}
