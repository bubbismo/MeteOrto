import type { DayHistory } from '../adapters/openmeteo/archive'
import { assessHail, type HailResult } from '../core/hail/hail'
import { assessFrost, type FrostNight } from '../core/frost/frost'
import { buildPastWater, nearReliability, rainNext48 } from '../core/irrigation/inputs'
import { irrigationAdvice, type IrrigationAdvice, type SoilType } from '../core/irrigation/irrigation'
import type { Climate } from './historyService'
import lavori from '../data/lavori.json'
import { tasksFor, type Task, type TaskAdvice } from '../core/lavori/lavori'
import type { Crop } from '../core/sowing/crops'
import { adviseAll, soilTemps, type MethodAdvice } from '../core/sowing/sowing'
import { findWorkWindows, type WorkWindow } from '../core/workwindows/workwindows'
import type { ForecastResult } from './forecastService'

export interface Insights {
  frost: FrostNight[]
  hail: HailResult
  advice: IrrigationAdvice
  work: WorkWindow[]
  sowing: MethodAdvice[]
  tasks: TaskAdvice[]
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
  const work = findWorkWindows(combined.hours, nowLocal)
  const { soilPast, soilNext } = soilTemps(combined.hours, nowLocal)
  return {
    frost,
    hail: assessHail(raw, nowLocal),
    soil: { past: soilPast, next: soilNext },
    sowing: adviseAll(crops, { today, soilPast, soilNext, frostNights: frost, lateFrostUntil: climate?.air.lastSpring?.p90 ?? null }),
    work,
    tasks: tasksFor(lavori as unknown as Task[], today, work, frost),
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
