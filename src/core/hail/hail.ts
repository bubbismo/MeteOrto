import { addDays } from '../dates'
import type { Convective, ModelSeries, RawForecast, ReliabilityLevel } from '../types'

/**
 * Hail alert from the convective ingredients of each model. Hail is the hardest thing to forecast:
 * this is a model-based estimate, not an official civil-protection alert.
 *
 * An hour scores points for: instability (CAPE), strong wind aloft relative to the ground (deep-layer
 * shear, which organises severe storms), and the models' own thunderstorm/hail weather codes.
 * Instability alone gives nothing unless the model also produces showers or thunder in that hour.
 */
export type HailLevel = 'nessuno' | 'gialla' | 'arancione'

export interface HailDay {
  date: string
  /** Days from today (0 = today). */
  dayIndex: number
  level: HailLevel
  /** Highest hourly score reached by any model (0-8). */
  score: number
  /** Models with data for the day, and how many of them reach the yellow threshold. */
  models: number
  agreeing: number
  /** Time span in which storms are expected, "HH:MM". */
  window: { from: string; to: string } | null
  capeMax: number
  /** A model explicitly forecasts hail (weather code 96 or 99). */
  hailCode: boolean
  confidence: ReliabilityLevel
}

export interface HailResult {
  /** False when the forecast has no convective data (e.g. an old cached download). */
  available: boolean
  days: HailDay[]
}

const SHEAR_FOR_ORGANISED = 12 // m/s
const SHEAR_STRONG = 18 // m/s

/** Wind from (speed, direction) as u/v components in m/s. */
function vec(speedKmh: number, dirDeg: number): [number, number] {
  const s = speedKmh / 3.6
  const r = (dirDeg * Math.PI) / 180
  return [-s * Math.sin(r), -s * Math.cos(r)]
}

/** Vector wind shear between the ground and 500 hPa, m/s (null if data are missing). */
export function shear(wind10: number | null, dir10: number | null, wind500: number | null, dir500: number | null): number | null {
  if (wind10 === null || dir10 === null || wind500 === null || dir500 === null) return null
  const [u0, v0] = vec(wind10, dir10)
  const [u5, v5] = vec(wind500, dir500)
  return Math.hypot(u5 - u0, v5 - v0)
}

export interface HourInput {
  cape: number | null
  shearMs: number | null
  precipitation: number | null
  weatherCode: number | null
  freezingLevel: number | null
}

/** Hail score of one model-hour, 0-8. */
export function hourScore(h: HourInput): number {
  const code = h.weatherCode ?? 0
  const thunder = code >= 95
  const showery = (code >= 80 && code <= 82) || thunder || (h.precipitation ?? 0) >= 0.5
  if (!showery) return 0 // instability without showers produces nothing
  const cape = h.cape ?? 0
  let s = cape >= 1500 ? 3 : cape >= 800 ? 2 : cape >= 300 ? 1 : 0
  if (cape >= 300 && h.shearMs !== null) s += h.shearMs >= SHEAR_STRONG ? 2 : h.shearMs >= SHEAR_FOR_ORGANISED ? 1 : 0
  s += code === 99 ? 3 : code === 96 ? 2 : code === 95 ? 1 : 0
  // a very high freezing level melts small hail before it reaches the ground
  if (h.freezingLevel !== null && h.freezingLevel > 4600 && s > 0) s -= 1
  return Math.max(0, Math.min(8, s))
}

/** Hours looked back for the pre-storm environment: a storm eats the CAPE that fed it. */
const ENV_HOURS = 3

function modelHours(m: ModelSeries, c: Convective, i: number): HourInput {
  let cape: number | null = null
  for (let k = Math.max(0, i - ENV_HOURS); k <= i; k++) {
    const v = c.cape[k]
    if (v !== null && v !== undefined) cape = Math.max(cape ?? 0, v)
  }
  return {
    cape,
    shearMs: shear(m.values.windSpeed[i] ?? null, c.dir10[i] ?? null, c.wind500[i] ?? null, c.dir500[i] ?? null),
    precipitation: m.values.precipitation[i] ?? null,
    weatherCode: m.weatherCode[i] ?? null,
    freezingLevel: c.freezingLevel[i] ?? null,
  }
}

/** What one model says about a day. */
export interface ModelDay {
  /** Best hourly score of the day, 0-8. */
  score: number
  /** The model forecasts hail explicitly (weather code 96 or 99). */
  hail: boolean
}

/** Hour score from which a model counts as "worried", and as "alarmed". */
const WORRIED = 3
const CONVINCED = 4
const ALARMED = 5

/**
 * Classifies a day. Tuned on past forecasts so that alerts stay rare enough to be believed
 * (a handful of days per summer, none in winter):
 * - yellow: one model is convinced and another is at least worried, or a model forecasts hail explicitly with a high score;
 * - orange: two models are alarmed, or one is very alarmed and another convinced.
 */
export function classify(models: ModelDay[], dayIndex: number): HailLevel {
  const n = (k: number) => models.filter((m) => m.score >= k).length
  let level: HailLevel = 'nessuno'
  if ((n(CONVINCED) >= 1 && n(WORRIED) >= 2) || models.some((m) => m.hail && m.score >= CONVINCED)) level = 'gialla'
  if (n(ALARMED) >= 2 || (n(6) >= 1 && n(CONVINCED) >= 2)) level = 'arancione'
  // far ahead the models are not reliable enough for an orange alert
  if (dayIndex >= 3 && level === 'arancione') level = 'gialla'
  return level
}

/**
 * Hail alert for today and the following days (up to 5 days ahead).
 * `nowLocal` is the local ISO time; hours already past today are ignored.
 */
export function assessHail(raw: RawForecast, nowLocal: string): HailResult {
  const withData = raw.models.filter((m) => m.convective && m.convective.cape.some((v) => v !== null))
  if (withData.length === 0) return { available: false, days: [] }

  const today = nowLocal.slice(0, 10)
  const nowHour = nowLocal.slice(0, 13) + ':00'
  const days: HailDay[] = []

  for (let dayIndex = 0; dayIndex <= 5; dayIndex++) {
    const date = addDays(today, dayIndex)
    const idx: number[] = []
    raw.times.forEach((t, i) => {
      if (t.startsWith(date) && t >= nowHour) idx.push(i)
    })
    if (idx.length < 4) continue

    const modelMax: ModelDay[] = []
    let capeMax = 0
    let hailCode = false
    const hot = new Set<number>() // hours where some model reaches the yellow-threshold of an hour
    for (const m of withData) {
      const c = m.convective!
      // models with a shorter horizon have no data for the later days
      if (!idx.some((i) => c.cape[i] !== null && c.cape[i] !== undefined)) continue
      let best = 0
      let modelHail = false
      for (const i of idx) {
        const h = modelHours(m, c, i)
        const s = hourScore(h)
        best = Math.max(best, s)
        capeMax = Math.max(capeMax, h.cape ?? 0)
        if ((h.weatherCode ?? 0) >= 96) {
          hailCode = true
          modelHail = true
        }
        if (s >= WORRIED) hot.add(i)
      }
      modelMax.push({ score: best, hail: modelHail })
    }
    if (modelMax.length === 0) continue

    const level = classify(modelMax, dayIndex)
    const hours = [...hot].sort((a, b) => a - b)
    const spread = modelMax.filter((m) => m.score >= WORRIED).length
    const share = spread / modelMax.length
    days.push({
      date,
      dayIndex,
      level,
      score: Math.max(...modelMax.map((m) => m.score)),
      models: modelMax.length,
      agreeing: spread,
      window: hours.length
        ? {
            from: raw.times[hours[0]].slice(11, 16),
            to: `${String((Number(raw.times[hours[hours.length - 1]].slice(11, 13)) + 1) % 24).padStart(2, '0')}:00`,
          }
        : null,
      capeMax: Math.round(capeMax),
      hailCode,
      confidence: level === 'nessuno' ? 'alta' : share >= 0.6 && dayIndex <= 2 ? 'alta' : share >= 0.4 ? 'media' : 'bassa',
    })
  }
  return { available: true, days }
}

/** The first day with an alert, or null. */
export function nextHailAlert(days: HailDay[]): HailDay | null {
  return days.find((d) => d.level !== 'nessuno') ?? null
}
