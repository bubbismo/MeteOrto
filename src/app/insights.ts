import type { DayHistory } from '../adapters/openmeteo/archive'
import { assessFrost, type FrostNight } from '../core/frost/frost'
import { buildPastWater, nearReliability, rainNext48 } from '../core/irrigation/inputs'
import { irrigationAdvice, type IrrigationAdvice, type SoilType } from '../core/irrigation/irrigation'
import type { Climate } from './historyService'
import type { Crop } from '../core/sowing/crops'
import { adviseAll, soilTemps, type MethodAdvice } from '../core/sowing/sowing'
import { findWorkWindows, type WorkWindow } from '../core/workwindows/workwindows'
import type { ForecastResult } from './forecastService'

export interface Insights {
  frost: FrostNight[]
  advice: IrrigationAdvice
  work: WorkWindow[]
  sowing: MethodAdvice[]
  soil: { past: number | null; next: number | null }
}

/** Everything the screens derive from the forecast and the history, computed in one place. */
export function computeInsights(
  data: ForecastResult,
  history: DayHistory[],
  soil: SoilType,
  crops: Crop[],
  climate: Climate | null,
): Insights {
  const { combined, nowLocal, raw } = data
  const past = buildPastWater(history, combined.hours, nowLocal)
  const today = nowLocal.slice(0, 10)
  const rainLast7 = past.filter((d) => d.date < today).slice(-7).reduce((a, d) => a + d.precip, 0)
  const frost = assessFrost(raw, combined, nowLocal)
  const { soilPast, soilNext } = soilTemps(combined.hours, nowLocal)
  return {
    frost,
    soil: { past: soilPast, next: soilNext },
    sowing: adviseAll(crops, { today, soilPast, soilNext, frostNights: frost, lateFrostUntil: climate?.air.lastSpring?.p90 ?? null }),
    work: findWorkWindows(combined.hours, nowLocal),
    advice: irrigationAdvice({
      past,
      rainLast7,
      rainNext48: rainNext48(combined.hours, nowLocal),
      reliability: nearReliability(combined),
      tMaxToday: combined.days[0]?.tMax ?? null,
      soil,
    }),
  }
}
