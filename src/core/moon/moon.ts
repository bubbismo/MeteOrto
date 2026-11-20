import * as SunCalc from 'suncalc'

export type MoonPhaseName =
  | 'nuova'
  | 'crescente'
  | 'primo-quarto'
  | 'gibbosa-crescente'
  | 'piena'
  | 'gibbosa-calante'
  | 'ultimo-quarto'
  | 'calante'

export interface MoonInfo {
  /** 0 = new moon, 0.5 = full moon, back to 1 = new. */
  phase: number
  /** Illuminated fraction, 0-1. */
  illumination: number
  /** Waxing (crescente) or waning (calante), as used in the gardening tradition. */
  waxing: boolean
  name: MoonPhaseName
  emoji: string
}

const NAMES: { name: MoonPhaseName; emoji: string }[] = [
  { name: 'nuova', emoji: '🌑' },
  { name: 'crescente', emoji: '🌒' },
  { name: 'primo-quarto', emoji: '🌓' },
  { name: 'gibbosa-crescente', emoji: '🌔' },
  { name: 'piena', emoji: '🌕' },
  { name: 'gibbosa-calante', emoji: '🌖' },
  { name: 'ultimo-quarto', emoji: '🌗' },
  { name: 'calante', emoji: '🌘' },
]

/** Moon phase at a given instant (default: local noon of a "YYYY-MM-DD" date when a string is given). */
export function moonAt(when: Date | string): MoonInfo {
  const date = typeof when === 'string' ? new Date(when + 'T12:00:00Z') : when
  const m = SunCalc.getMoonIllumination(date)
  // 8 equal slices centred on the main phases
  const slot = Math.floor(((m.phase * 8 + 0.5) % 8 + 8) % 8)
  return { phase: m.phase, illumination: m.fraction, waxing: m.phase < 0.5, ...NAMES[slot] }
}

export interface MoonDay extends MoonInfo {
  date: string
}

/** Phase of every day of a month (month: 1-12). */
export function moonMonth(year: number, month: number): MoonDay[] {
  const out: MoonDay[] = []
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let d = 1; d <= n; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    out.push({ date, ...moonAt(date) })
  }
  return out
}

/** Days until the next new or full moon, looking at noon samples up to 31 days ahead. */
export function nextMainPhase(fromDate: string): { kind: 'nuova' | 'piena'; inDays: number } {
  const start = moonAt(fromDate).phase
  for (let i = 1; i <= 31; i++) {
    const date = new Date(Date.parse(fromDate + 'T12:00:00Z') + i * 86400000).toISOString().slice(0, 10)
    const p = moonAt(date).phase
    const prev = i === 1 ? start : moonAt(new Date(Date.parse(date + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10)).phase
    if (prev < 0.5 && p >= 0.5) return { kind: 'piena', inDays: i }
    if (prev > 0.5 && p < 0.5) return { kind: 'nuova', inDays: i }
  }
  return { kind: 'piena', inDays: 31 }
}
