import { addDays } from '../dates'
import type { CombinedForecast, HourlyPoint, ReliabilityLevel } from '../types'
import type { DayWater } from './irrigation'

const WATER_DAYS = 21

/**
 * Daily rain and ET0 for the last `days` days (default 21) up to now.
 * Past days come from the archive when available, otherwise from the forecast models' own hours;
 * today counts only the hours already elapsed.
 */
export function buildPastWater(history: DayWater[], hours: HourlyPoint[], nowLocal: string, days = WATER_DAYS): DayWater[] {
  const today = nowLocal.slice(0, 10)
  const nowHour = nowLocal.slice(0, 13) + ':00'
  const archive = new Map(history.map((d) => [d.date, d]))
  const sums = (date: string, upTo?: string): DayWater | null => {
    const hs = hours.filter((h) => h.time.startsWith(date) && (!upTo || h.time <= upTo) && h.precipitation !== null)
    if (hs.length === 0) return null
    return {
      date,
      precip: hs.reduce((a, h) => a + (h.precipitation ?? 0), 0),
      et0: hs.reduce((a, h) => a + (h.et0 ?? 0), 0),
    }
  }
  const out: DayWater[] = []
  for (let i = days; i >= 1; i--) {
    const date = addDays(today, -i)
    const d = archive.get(date) ?? sums(date)
    if (d) out.push({ date, precip: d.precip, et0: d.et0 })
  }
  const t = sums(today, nowHour)
  if (t) out.push(t)
  return out
}

/** Forecast rain over the 48 hours starting from the current hour, mm. */
export function rainNext48(hours: HourlyPoint[], nowLocal: string): number {
  const nowHour = nowLocal.slice(0, 13) + ':00'
  const i = hours.findIndex((h) => h.time >= nowHour)
  if (i < 0) return 0
  return hours.slice(i, i + 48).reduce((a, h) => a + (h.precipitation ?? 0), 0)
}

const ORDER: ReliabilityLevel[] = ['bassa', 'media', 'alta']

/** The weakest reliability among today and tomorrow (the days the irrigation advice leans on). */
export function nearReliability(combined: CombinedForecast): ReliabilityLevel {
  const lv = combined.days.slice(0, 2).map((d) => d.reliability.level)
  if (lv.length === 0) return 'bassa'
  return lv.reduce((a, b) => (ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b))
}
