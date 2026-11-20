import { dayOfYear } from '../dates'

export interface DailyMin {
  /** "YYYY-MM-DD" */
  date: string
  tMin: number | null
}

export interface DateSpread {
  /** "MM-DD" strings */
  earliest: string
  p10: string
  median: string
  p90: string
  latest: string
}

export interface FrostSeason {
  /** Years in which the event happened at least once. */
  years: number
  /** Last frost of the winter-spring (Jan-Jun). */
  lastSpring: DateSpread | null
  /** First frost of autumn (Jul-Dec). */
  firstAutumn: DateSpread | null
  /** Day of year of each year's last spring frost (for probabilities). */
  springDoys: number[]
}

const REF_YEAR = 2001 // non-leap year used to turn a day of year back into MM-DD

function doyToMonthDay(doy: number): string {
  return new Date(Date.UTC(REF_YEAR, 0, doy)).toISOString().slice(5, 10)
}

function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

function spread(doys: number[]): DateSpread | null {
  if (doys.length === 0) return null
  const s = [...doys].sort((a, b) => a - b)
  return {
    earliest: doyToMonthDay(s[0]),
    p10: doyToMonthDay(Math.round(percentile(s, 0.1))),
    median: doyToMonthDay(Math.round(percentile(s, 0.5))),
    p90: doyToMonthDay(Math.round(percentile(s, 0.9))),
    latest: doyToMonthDay(s[s.length - 1]),
  }
}

/** Day of year ignoring leap days, so that the same calendar date always has the same value. */
function normDoy(date: string): number {
  const d = dayOfYear(date)
  const y = Number(date.slice(0, 4))
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  return leap && d > 59 ? d - 1 : d
}

/**
 * Typical dates of the last spring frost and first autumn frost from a long daily record.
 * A frost day is one whose minimum is at or below `threshold` (0 °C for air frost;
 * about 2 °C is a good proxy for frost on the ground under clear sky).
 */
export function frostSeason(daily: DailyMin[], threshold = 0): FrostSeason {
  const lastSpring = new Map<string, number>()
  const firstAutumn = new Map<string, number>()
  for (const { date, tMin } of daily) {
    if (tMin === null || tMin > threshold) continue
    const year = date.slice(0, 4)
    const doy = normDoy(date)
    const month = Number(date.slice(5, 7))
    if (month <= 6) lastSpring.set(year, Math.max(lastSpring.get(year) ?? 0, doy))
    else if (!firstAutumn.has(year) || doy < firstAutumn.get(year)!) firstAutumn.set(year, doy)
  }
  const spring = [...lastSpring.values()]
  return {
    years: new Set([...lastSpring.keys(), ...firstAutumn.keys()]).size,
    lastSpring: spread(spring),
    firstAutumn: spread([...firstAutumn.values()]),
    springDoys: spring,
  }
}

/**
 * Share of years (0-1) in which a frost still occurred after the given date (spring only).
 * Years without any spring frost count as "no further frost".
 */
export function frostAfterProbability(season: FrostSeason, date: string, totalYears: number): number {
  if (totalYears <= 0) return 0
  const d = normDoy(date)
  return season.springDoys.filter((x) => x > d).length / totalYears
}
