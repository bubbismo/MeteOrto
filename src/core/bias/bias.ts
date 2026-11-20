import type { HourlyPoint, Observation } from '../types'

export interface Bias {
  /** Mean (measured - forecast) temperature, °C. Negative: the station is colder than the models. */
  temperature: number
  /** Hours compared. */
  samples: number
}

/** Hours needed before a correction is trusted (two days). */
export const MIN_SAMPLES = 48

/**
 * How far the combined forecast was from the personal station over the same hours.
 * Returns null when there are too few matching hours to say anything reliable.
 */
export function estimateBias(observations: Observation[], forecast: HourlyPoint[]): Bias | null {
  const byTime = new Map(forecast.map((h) => [h.time, h]))
  const diffs: number[] = []
  for (const o of observations) {
    const f = byTime.get(o.time)
    if (o.temperature === undefined || f?.temperature == null) continue
    diffs.push(o.temperature - f.temperature)
  }
  if (diffs.length < MIN_SAMPLES) return null
  return { temperature: diffs.reduce((a, b) => a + b, 0) / diffs.length, samples: diffs.length }
}

/** The forecast shifted by the station's bias (only temperature and dew point, which move together). */
export function applyBias(hours: HourlyPoint[], bias: Bias | null): HourlyPoint[] {
  if (!bias) return hours
  const d = bias.temperature
  return hours.map((h) => ({
    ...h,
    temperature: h.temperature === null ? null : h.temperature + d,
    dewPoint: h.dewPoint === null ? null : h.dewPoint + d,
  }))
}
