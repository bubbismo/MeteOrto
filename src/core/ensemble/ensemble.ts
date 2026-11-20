import {
  VARIABLES,
  type CombinedForecast,
  type DailySummary,
  type HourlyPoint,
  type ModelSeries,
  type RawForecast,
  type Reliability,
  type Sky,
  type Variable,
} from '../types'

const HIGH_RES = new Set(['icon_d2', 'meteofrance_arome_france', 'italia_meteo_arpae_icon_2i'])

/** Hours of lead time within which high-resolution local models are trusted most. */
const SHORT_RANGE_HOURS = 48

/** Weight of a model for a given lead time (hours from now). */
export function modelWeight(model: string, leadHours: number): number {
  if (leadHours < SHORT_RANGE_HOURS) return HIGH_RES.has(model) ? 2 : 1
  return model === 'ecmwf_ifs025' ? 2 : 1
}

function weightedMean(items: { v: number; w: number }[]): number | null {
  if (items.length === 0) return null
  let sw = 0
  let s = 0
  for (const { v, w } of items) {
    s += v * w
    sw += w
  }
  return s / sw
}

/** Sky condition derived from combined values, so the icon always agrees with the numbers. */
export function deriveSky(p: {
  precipitation: number | null
  cloudCover: number | null
  temperature: number | null
  storm?: boolean
  fog?: boolean
}): Sky {
  if ((p.precipitation ?? 0) >= 0.2) {
    if (p.storm) return 'storm'
    if ((p.temperature ?? 10) <= 1) return 'snow'
    return 'rain'
  }
  if (p.fog) return 'fog'
  const c = p.cloudCover ?? 0
  if (c < 30) return 'sun'
  if (c < 65) return 'partly'
  return 'cloudy'
}

function combineHour(models: ModelSeries[], i: number, lead: number): HourlyPoint & { time: string } {
  const out: Record<string, number | null> = {}
  for (const variable of VARIABLES) {
    const items: { v: number; w: number }[] = []
    for (const m of models) {
      const v = m.values[variable][i]
      if (v !== null && v !== undefined) items.push({ v, w: modelWeight(m.model, lead) })
    }
    out[variable] = weightedMean(items)
  }
  const codes = models.map((m) => m.weatherCode[i]).filter((c): c is number => c !== null && c !== undefined)
  const storm = codes.some((c) => c >= 95)
  const fog = codes.length > 0 && codes.filter((c) => c === 45 || c === 48).length * 2 >= codes.length
  const modelCount = models.filter((m) => m.values.temperature[i] !== null && m.values.temperature[i] !== undefined).length
  const base = out as Record<Variable, number | null>
  return {
    time: '',
    ...base,
    sky: deriveSky({ ...base, storm, fog }),
    modelCount,
  }
}

function std(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
}

export interface ModelDayStats {
  tMin: number
  tMax: number
  precipSum: number
}

/**
 * Agreement between models on one day, as a 0-100 score.
 * Penalises temperature spread, disagreement on whether it rains and on how much,
 * the distance in time, and having a single model only.
 */
export function dayReliability(stats: ModelDayStats[], dayIndex: number): Reliability {
  let score = 100 - Math.min(16, dayIndex * 4)
  if (stats.length < 2) {
    score -= 20
  } else {
    const tempSpread = (std(stats.map((s) => s.tMin)) + std(stats.map((s) => s.tMax))) / 2
    score -= Math.min(40, tempSpread * 15)

    const sums = stats.map((s) => s.precipSum)
    const wetShare = sums.filter((s) => s >= 1).length / sums.length
    score -= Math.min(wetShare, 1 - wetShare) * 2 * 25
    const mean = sums.reduce((a, b) => a + b, 0) / sums.length
    const range = Math.max(...sums) - Math.min(...sums)
    score -= Math.min(15, (range / Math.max(3, mean)) * 10)
  }
  score = Math.max(0, Math.min(100, Math.round(score)))
  return { score, level: score >= 70 ? 'alta' : score >= 45 ? 'media' : 'bassa' }
}

const MIN_HOURS_PER_DAY = 18

function modelDayStats(m: ModelSeries, idx: number[]): ModelDayStats | null {
  const temps = idx.map((i) => m.values.temperature[i]).filter((v): v is number => v !== null && v !== undefined)
  const rains = idx.map((i) => m.values.precipitation[i]).filter((v): v is number => v !== null && v !== undefined)
  if (temps.length < MIN_HOURS_PER_DAY || rains.length < MIN_HOURS_PER_DAY) return null
  return {
    tMin: Math.min(...temps),
    tMax: Math.max(...temps),
    precipSum: rains.reduce((a, b) => a + b, 0),
  }
}

function nums(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null)
}

/**
 * Merges all models into one hourly series and daily summaries.
 * @param nowLocal local time of "now" as ISO string (e.g. "2026-11-20T14:00"), same timezone as raw.times
 */
export function combineForecast(raw: RawForecast, nowLocal: string): CombinedForecast {
  const models = raw.models
  let nowIdx = raw.times.findIndex((t) => t >= nowLocal.slice(0, 13) + ':00')
  if (nowIdx < 0) nowIdx = raw.times.length

  const hours: HourlyPoint[] = raw.times.map((time, i) => {
    const p = combineHour(models, i, Math.max(0, i - nowIdx))
    return { ...p, time }
  })

  const today = nowLocal.slice(0, 10)
  const todayMs = Date.parse(today + 'T00:00:00Z')
  const byDate = new Map<string, number[]>()
  raw.times.forEach((t, i) => {
    const d = t.slice(0, 10)
    if (d < today) return
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(i)
  })

  const days: DailySummary[] = []
  for (const [date, idx] of byDate) {
    if (idx.length < 12) continue // truncated trailing day
    const dayIndex = Math.round((Date.parse(date + 'T00:00:00Z') - todayMs) / 86400000)
    const pts = idx.map((i) => hours[i])
    const temps = nums(pts.map((p) => p.temperature))
    const precipSum = nums(pts.map((p) => p.precipitation)).reduce((a, b) => a + b, 0)
    const winds = nums(pts.map((p) => p.windSpeed))
    const gusts = nums(pts.map((p) => p.windGusts))
    const daytime = pts.filter((p) => {
      const h = Number(p.time.slice(11, 13))
      return h >= 8 && h <= 19
    })
    const clouds = nums(daytime.map((p) => p.cloudCover))
    const cloudMean = clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : 0
    const stormy = pts.some((p) => p.sky === 'storm')
    const tMax = temps.length ? Math.max(...temps) : null
    const sky = deriveSky({
      precipitation: precipSum >= 1 ? precipSum : 0,
      cloudCover: cloudMean,
      temperature: tMax,
      storm: stormy,
    })
    const stats = models.map((m) => modelDayStats(m, idx)).filter((s): s is ModelDayStats => s !== null)
    days.push({
      date,
      dayIndex,
      tMin: temps.length ? Math.min(...temps) : null,
      tMax,
      precipSum: Math.round(precipSum * 10) / 10,
      windMax: winds.length ? Math.max(...winds) : null,
      gustMax: gusts.length ? Math.max(...gusts) : null,
      sky,
      reliability: dayReliability(stats, dayIndex),
    })
  }
  return { hours, days }
}
