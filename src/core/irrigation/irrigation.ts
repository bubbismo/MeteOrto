import type { ReliabilityLevel } from '../types'

export type SoilType = 'sabbioso' | 'medio' | 'argilloso'

/** Water the soil can hold within reach of vegetable roots, in mm. */
export const SOIL_CAPACITY_MM: Record<SoilType, number> = { sabbioso: 15, medio: 25, argilloso: 35 }

/** Crop coefficient: how much of the reference evapotranspiration a garden bed uses. */
const KC = 0.8
const START_FILL = 0.6
const FRESH_ENOUGH = 0.5
const URGENT = 0.25
const COLD_TMAX = 6

export interface DayWater {
  date: string
  /** Rain, mm. */
  precip: number
  /** Reference evapotranspiration ET0, mm. */
  et0: number
}

/** Rain below 1 mm wets only the leaves; the rest soaks in (excess beyond capacity is lost). */
export function effectiveRain(mm: number): number {
  return mm < 1 ? 0 : mm * 0.9
}

/**
 * Simple "bucket" water balance: soil moisture (mm) after the last day of `days`
 * (oldest first, ideally 14-21 days, up to and including today's elapsed hours).
 */
export function soilMoisture(days: DayWater[], soil: SoilType): number {
  const cap = SOIL_CAPACITY_MM[soil]
  let s = cap * START_FILL
  for (const d of days) s = Math.max(0, Math.min(cap, s + effectiveRain(d.precip) - KC * d.et0))
  return s
}

export type IrrigationAction = 'annaffia' | 'aspetta' | 'non-serve'

export interface IrrigationAdvice {
  action: IrrigationAction
  reason: 'terreno-umido' | 'pioggia-in-arrivo' | 'terreno-asciutto' | 'freddo'
  /** Estimated soil moisture as share of capacity, 0-100. */
  moisturePct: number
  /** Rain over the last 7 days, mm. */
  rainLast7: number
  /** Forecast rain in the next 48 hours, mm. */
  rainNext48: number
  /** Agreement of the models on the coming days. */
  reliability: ReliabilityLevel
  /** How much water to give, mm (0 when not needed). */
  suggestedMm: number
  urgent: boolean
}

export interface IrrigationInput {
  /** Oldest first, ending with today's elapsed hours. */
  past: DayWater[]
  rainNext48: number
  reliability: ReliabilityLevel
  tMaxToday: number | null
  soil: SoilType
  /** Rain over the 7 completed days before today, mm (default: last 7 entries of `past`). */
  rainLast7?: number
}

/** Should the garden be watered today, or wait? Crosses fallen rain, forecast rain and evapotranspiration. */
export function irrigationAdvice(input: IrrigationInput): IrrigationAdvice {
  const cap = SOIL_CAPACITY_MM[input.soil]
  const s = soilMoisture(input.past, input.soil)
  const ratio = s / cap
  const rainLast7 = input.rainLast7 ?? input.past.slice(-7).reduce((a, d) => a + d.precip, 0)
  const base = {
    moisturePct: Math.round(ratio * 100),
    rainLast7: Math.round(rainLast7 * 10) / 10,
    rainNext48: Math.round(input.rainNext48 * 10) / 10,
    reliability: input.reliability,
    suggestedMm: 0,
    urgent: false,
  }

  if (input.tMaxToday !== null && input.tMaxToday < COLD_TMAX) return { ...base, action: 'non-serve', reason: 'freddo' }
  if (ratio >= FRESH_ENOUGH) return { ...base, action: 'non-serve', reason: 'terreno-umido' }

  const rainWorthWaiting = input.rainNext48 >= (ratio >= 0.3 ? 4 : 6)
  if (rainWorthWaiting && input.reliability !== 'bassa') return { ...base, action: 'aspetta', reason: 'pioggia-in-arrivo' }

  const need = Math.round(cap * 0.8 - s)
  return {
    ...base,
    action: 'annaffia',
    reason: 'terreno-asciutto',
    suggestedMm: Math.max(5, Math.min(20, need)),
    urgent: ratio < URGENT,
  }
}
