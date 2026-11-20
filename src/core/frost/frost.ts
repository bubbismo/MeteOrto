import { addDays } from '../dates'
import type { CombinedForecast, HourlyPoint, RawForecast, ReliabilityLevel } from '../types'

export type FrostLevel = 'nessuno' | 'possibile' | 'probabile'

export interface FrostNight {
  /** Date of the morning that ends the night. */
  morningDate: string
  /** Days from today of that morning (0 = this morning). */
  dayIndex: number
  /** Forecast minimum air temperature at 2 m. */
  tMinAir: number
  /** Estimated minimum temperature at plant level. */
  tMinGround: number
  level: FrostLevel
  confidence: ReliabilityLevel
  /** Why the ground cools more than the air. */
  factors: { clearSky: boolean; calm: boolean; dryAir: boolean }
  /** Local time of the first hour at or below 0 °C (air), if any. */
  firstFrostTime: string | null
}

export interface FrostOptions {
  /** Ground temperature below which frost is "possibile" (default 3 °C). */
  possibleBelow?: number
  /** Ground temperature at or below which frost is "probabile" (default 0 °C). */
  probableAtOrBelow?: number
}

const NIGHT_START_HOUR = 18
const NIGHT_END_HOUR = 9
/** Largest typical difference between air at 2 m and ground on a perfect radiative night. */
const MAX_RADIATIVE_COOLING = 3.5

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * Extra cooling of the ground compared with the air at 2 m (°C, 0 to 3.5).
 * Strongest with clear sky, calm wind and dry air (large gap between temperature and dew point);
 * damp air or fog releases latent heat and limits it.
 */
export function radiativeCooling(cloudCover: number, windKmh: number, dewDepression: number): number {
  const sky = clamp01((100 - cloudCover) / 100)
  const wind = windKmh <= 4 ? 1 : windKmh >= 15 ? 0.15 : 1 - ((windKmh - 4) / 11) * 0.85
  const dry = dewDepression >= 6 ? 1 : dewDepression <= 1.5 ? 0.25 : 0.25 + ((dewDepression - 1.5) / 4.5) * 0.75
  return MAX_RADIATIVE_COOLING * sky * wind * dry
}

function std(values: number[]): number {
  if (values.length < 2) return 0
  const m = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length)
}

function confidenceOf(spread: number, modelCount: number, dayIndex: number): ReliabilityLevel {
  let c = spread < 1 ? 2 : spread < 2 ? 1 : 0
  if (modelCount < 2) c = Math.min(c, 1)
  if (dayIndex >= 4) c -= 1
  c = Math.max(0, c)
  return (['bassa', 'media', 'alta'] as const)[c]
}

function avg(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/**
 * Frost assessment for the coming nights (up to 5 mornings ahead).
 * Combines minimum temperature, dew point, cloud cover and wind around the coldest hour.
 */
export function assessFrost(
  raw: RawForecast,
  combined: CombinedForecast,
  nowLocal: string,
  opts: FrostOptions = {},
): FrostNight[] {
  const possibleBelow = opts.possibleBelow ?? 3
  const probableAt = opts.probableAtOrBelow ?? 0
  const today = nowLocal.slice(0, 10)
  const nowHour = nowLocal.slice(0, 13) + ':00'
  const out: FrostNight[] = []

  for (let dayIndex = 0; dayIndex <= 5; dayIndex++) {
    const morning = addDays(today, dayIndex)
    const from = `${addDays(morning, -1)}T${String(NIGHT_START_HOUR).padStart(2, '0')}:00`
    const to = `${morning}T${String(NIGHT_END_HOUR).padStart(2, '0')}:00`
    const idx: number[] = []
    raw.times.forEach((t, i) => {
      if (t >= from && t < to && t >= nowHour) idx.push(i)
    })
    const hours: HourlyPoint[] = idx.map((i) => combined.hours[i])
    const temps = hours.filter((h) => h.temperature !== null)
    if (temps.length < 4) continue

    let coldest = temps[0]
    for (const h of temps) if (h.temperature! < coldest.temperature!) coldest = h
    const ci = hours.indexOf(coldest)
    const around = hours.slice(Math.max(0, ci - 1), ci + 2)
    const cloud = avg(around.map((h) => h.cloudCover)) ?? 50
    const wind = avg(around.map((h) => h.windSpeed)) ?? 5
    const dewDep = avg(around.map((h) => (h.temperature !== null && h.dewPoint !== null ? h.temperature - h.dewPoint : null))) ?? 3

    const tMinAir = coldest.temperature!
    const tMinGround = tMinAir - radiativeCooling(cloud, wind, dewDep)
    const level: FrostLevel = tMinGround <= probableAt ? 'probabile' : tMinGround < possibleBelow ? 'possibile' : 'nessuno'

    const modelMins = raw.models
      .map((m) => {
        const v = idx.map((i) => m.values.temperature[i]).filter((x): x is number => x !== null && x !== undefined)
        return v.length >= 4 ? Math.min(...v) : null
      })
      .filter((x): x is number => x !== null)
    const spread = std(modelMins)

    const firstFrost = hours.find((h) => h.temperature !== null && h.temperature <= 0)
    out.push({
      morningDate: morning,
      dayIndex,
      tMinAir,
      tMinGround,
      level,
      confidence: confidenceOf(spread, modelMins.length, dayIndex),
      factors: { clearSky: cloud < 30, calm: wind < 6, dryAir: dewDep >= 5 },
      firstFrostTime: firstFrost ? firstFrost.time : null,
    })
  }
  return out
}

/** The first night in the list that carries a risk, or null. */
export function nextFrostRisk(nights: FrostNight[]): FrostNight | null {
  return nights.find((n) => n.level !== 'nessuno') ?? null
}
