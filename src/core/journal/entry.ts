import { monthDayOf } from '../dates'
import { METHODS, type Crop, type Method } from '../sowing/crops'
import { inPeriod } from '../sowing/sowing'
import type { JournalEntry } from './types'
import type { WeatherSummary } from './weather'

/** The technique most likely used today: the first whose window contains today, else the first the crop has. */
export function defaultMethod(crop: Crop, today: string): Method {
  const md = monthDayOf(today)
  const available = METHODS.filter((m) => crop.periods[m]?.length)
  return available.find((m) => crop.periods[m]!.some((p) => inPeriod(md, p))) ?? available[0] ?? 'diretta'
}

export function newEntry(crop: Crop, method: Method, date: string, place: { lat: number; lon: number }, now = Date.now()): JournalEntry {
  return {
    id: `j-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    cropId: crop.id,
    cropName: crop.name,
    emoji: crop.emoji,
    method,
    sownOn: date,
    lat: place.lat,
    lon: place.lon,
    createdAt: now,
  }
}

export type WhyCode = 'suolo-freddo' | 'gelate' | 'molta-pioggia' | 'siccita' | 'condizioni-buone'

/**
 * Reads the first two weeks of weather against what the crop needs, to hint at why a sowing
 * went well or badly. Only observations, never certainties.
 */
export function explainOutcome(s: WeatherSummary, quality: number | undefined, soilTempMin: number): WhyCode[] {
  const out: WhyCode[] = []
  if (s.soilMean !== null && s.soilMean < soilTempMin) out.push('suolo-freddo')
  if (s.frostNights > 0) out.push('gelate')
  if (s.rain > 80) out.push('molta-pioggia')
  if (s.rain < 5 && s.days >= 10) out.push('siccita')
  if (out.length === 0 && quality !== undefined && quality >= 4) out.push('condizioni-buone')
  return out
}
