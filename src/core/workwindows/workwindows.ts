import { addDays } from '../dates'
import type { HourlyPoint } from '../types'

export type WorkProfile = 'lavori' | 'trattamenti' | 'sfalcio'

export interface ProfileRules {
  /** Max sustained wind, km/h. */
  maxWind: number
  maxGust: number
  minTemp: number
  maxTemp: number
  /** Hours after the window that must stay dry. */
  dryAfterHours: number
  /** Hours before the window in which rain must have been (almost) absent. */
  dryBeforeHours: number
}

export const PROFILES: Record<WorkProfile, ProfileRules> = {
  // general work in the garden
  lavori: { maxWind: 20, maxGust: 35, minTemp: 2, maxTemp: 32, dryAfterHours: 2, dryBeforeHours: 0 },
  // spraying: calm air, and no rain washing the product away
  trattamenti: { maxWind: 10, maxGust: 20, minTemp: 8, maxTemp: 26, dryAfterHours: 6, dryBeforeHours: 0 },
  // mowing: dry grass
  sfalcio: { maxWind: 25, maxGust: 40, minTemp: 5, maxTemp: 34, dryAfterHours: 4, dryBeforeHours: 24 },
}

export interface WorkWindow {
  profile: WorkProfile
  date: string
  dayIndex: number
  /** "HH:MM" */
  start: string
  end: string
  hours: number
}

export interface WorkOptions {
  /** Morning slot, local hours [from, to). */
  fromHour?: number
  toHour?: number
  /** Shortest useful window, hours. */
  minHours?: number
  days?: number
}

const DRY = 0.1 // mm per hour
const RAIN_TOLERANCE = 0.3 // mm in the "dry after" period
const BEFORE_TOLERANCE = 1 // mm in the "dry before" period

function hourlyOk(h: HourlyPoint, r: ProfileRules): boolean {
  if (h.precipitation === null || h.temperature === null) return false
  if ((h.precipitation ?? 0) > DRY) return false
  if ((h.windSpeed ?? 0) > r.maxWind || (h.windGusts ?? 0) > r.maxGust) return false
  return h.temperature >= r.minTemp && h.temperature <= r.maxTemp
}

const sumPrecip = (hs: HourlyPoint[]) => hs.reduce((a, h) => a + (h.precipitation ?? 0), 0)

/**
 * Best dry, calm morning stretch of each day for the three kinds of outdoor work.
 * `hours` is the combined hourly forecast (it may include past hours, used for the "dry before" rule).
 */
export function findWorkWindows(hours: HourlyPoint[], nowLocal: string, opts: WorkOptions = {}): WorkWindow[] {
  const from = opts.fromHour ?? 6
  const to = opts.toHour ?? 12
  const minHours = opts.minHours ?? 2
  const nDays = opts.days ?? 5
  const today = nowLocal.slice(0, 10)
  const nowHour = nowLocal.slice(0, 13) + ':00'
  const out: WorkWindow[] = []

  for (const profile of Object.keys(PROFILES) as WorkProfile[]) {
    const rules = PROFILES[profile]
    for (let dayIndex = 0; dayIndex < nDays; dayIndex++) {
      const date = addDays(today, dayIndex)
      const slot = hours
        .map((h, i) => ({ h, i }))
        .filter(({ h }) => h.time.startsWith(date) && Number(h.time.slice(11, 13)) >= from && Number(h.time.slice(11, 13)) < to && h.time >= nowHour)

      let best: { start: number; end: number } | null = null
      let run: { start: number; end: number } | null = null
      for (const { h, i } of slot) {
        if (hourlyOk(h, rules)) {
          run = run && run.end === i ? { start: run.start, end: i + 1 } : { start: i, end: i + 1 }
          if (!best || run.end - run.start > best.end - best.start) best = run
        } else run = null
      }
      // a run only counts if rain does not arrive right after (or fell right before)
      // re-check by shrinking nothing: test the whole run and, if it fails, drop it
      while (best) {
        const after = hours.slice(best.end, best.end + rules.dryAfterHours)
        const before = hours.slice(Math.max(0, best.start - rules.dryBeforeHours), best.start)
        const afterOk = sumPrecip(after) <= RAIN_TOLERANCE
        const beforeOk = sumPrecip(before) <= BEFORE_TOLERANCE
        if (afterOk && beforeOk) break
        best = null
      }
      if (best && best.end - best.start >= minHours) {
        out.push({
          profile,
          date,
          dayIndex,
          start: hours[best.start].time.slice(11, 16),
          end: `${String((Number(hours[best.end - 1].time.slice(11, 13)) + 1) % 24).padStart(2, '0')}:00`,
          hours: best.end - best.start,
        })
      }
    }
  }
  return out
}
