import { parseCsvRows } from '../../core/journal/backup'
import type { DataSource, Observation } from '../../core/types'

const num = (s: string | undefined): number | undefined => {
  if (s === undefined || s.trim() === '') return undefined
  const v = Number(s.replace(',', '.'))
  return Number.isFinite(v) ? v : undefined
}

/**
 * Reads station data from CSV text. Header names (case-insensitive): `time` (ISO, "2026-11-20 14:00" or
 * "2026-11-20T14:00"), `temperature`, `precipitation`, `wind`. Rows within the same hour are averaged
 * (rain is summed).
 */
export function parseObservationsCsv(text: string): Observation[] {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return []
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => head.indexOf(name)
  const [ti, te, pr, wi] = [col('time'), col('temperature'), col('precipitation'), col('wind')]
  if (ti < 0) return []

  const hours = new Map<string, { t: number[]; p: number[]; w: number[] }>()
  for (const r of rows.slice(1)) {
    const raw = (r[ti] ?? '').trim().replace(' ', 'T')
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}/.test(raw)) continue
    const key = raw.slice(0, 13) + ':00'
    const h = hours.get(key) ?? { t: [], p: [], w: [] }
    const t = num(r[te])
    const p = num(r[pr])
    const w = num(r[wi])
    if (t !== undefined) h.t.push(t)
    if (p !== undefined) h.p.push(p)
    if (w !== undefined) h.w.push(w)
    hours.set(key, h)
  }
  const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined)
  return [...hours.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, h]) => ({
      time,
      temperature: mean(h.t),
      precipitation: h.p.length ? h.p.reduce((a, b) => a + b, 0) : undefined,
      windSpeed: mean(h.w),
    }))
}

/** A DataSource backed by CSV text (an export from the station's software). */
export function csvSource(label: string, text: string): DataSource {
  const all = parseObservationsCsv(text)
  return {
    id: 'csv',
    label,
    async fetchObservations(from, to) {
      const a = from.toISOString().slice(0, 13)
      const b = to.toISOString().slice(0, 13)
      return all.filter((o) => o.time.slice(0, 13) >= a && o.time.slice(0, 13) <= b)
    },
  }
}
