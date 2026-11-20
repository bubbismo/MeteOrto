import { daysUntilMonthDay, monthDayOf } from '../dates'
import type { FrostNight } from '../frost/frost'
import type { HourlyPoint } from '../types'
import { METHODS, type Crop, type Method, type Period } from './crops'

export type SowStatus = 'ora' | 'rimanda' | 'attenzione' | 'presto' | 'fuori'

export interface SowingConditions {
  /** Local date "YYYY-MM-DD". */
  today: string
  /** Mean soil temperature (6 cm) of the last 7 days, °C. */
  soilPast: number | null
  /** Mean soil temperature (6 cm) forecast for the next 5 days, °C. */
  soilNext: number | null
  /** Coming nights from the frost assessment. */
  frostNights: FrostNight[]
  /** "MM-DD" by which 90% of years have had their last spring frost (history of the place). */
  lateFrostUntil: string | null
}

export interface MethodAdvice {
  crop: Crop
  method: Method
  status: SowStatus
  /** Why a sowing is postponed or flagged. */
  reason?: 'suolo-freddo' | 'gelo-previsto'
  /** The window of the table that matches today (or the next one). */
  period: Period | null
  /** Days until the next window opens (status "presto"). */
  startsIn?: number
  soilPast: number | null
  soilNext: number | null
  soilNeeded: number
  /** Soil is below the threshold now but the forecast says it is warming up: sowing is allowed. */
  warming?: boolean
  /** The frost that triggers the warning. */
  frost?: { date: string; dayIndex: number; tMinAir: number; tMinGround: number; level: FrostNight['level'] }
  /** Late frosts are still possible in this place up to this "MM-DD" (beyond the forecast horizon). */
  lateFrostUntil?: string
}

/** True when "MM-DD" falls in the window (windows may wrap over New Year). */
export function inPeriod(md: string, p: Period): boolean {
  return p.from <= p.to ? md >= p.from && md <= p.to : md >= p.from || md <= p.to
}

/**
 * Frost that is a threat for a crop in the coming nights, if any.
 * Tender crops: any frost risk; half-hardy: ground at -3 °C or below; hardy: -6 °C or below.
 */
function frostThreat(crop: Crop, nights: FrostNight[]): FrostNight | null {
  for (const n of nights) {
    const hit =
      crop.frost === 'sensibile' ? n.level !== 'nessuno' : crop.frost === 'tollerante' ? n.tMinGround <= -3 : n.tMinGround <= -6
    if (hit) return n
  }
  return null
}

/** How many days ahead a window is still "coming soon". */
export const SOON_DAYS = 21

function adviseMethod(crop: Crop, method: Method, periods: Period[], c: SowingConditions): MethodAdvice {
  const md = monthDayOf(c.today)
  const base = {
    crop,
    method,
    soilPast: c.soilPast,
    soilNext: c.soilNext,
    soilNeeded: crop.soilTempMin,
  }
  const active = periods.find((p) => inPeriod(md, p))
  if (!active) {
    const next = periods.map((p) => ({ p, d: daysUntilMonthDay(c.today, p.from) })).sort((a, b) => a.d - b.d)[0]
    return next.d <= SOON_DAYS
      ? { ...base, status: 'presto', period: next.p, startsIn: next.d }
      : { ...base, status: 'fuori', period: next.p, startsIn: next.d }
  }

  // The seedbed is protected: soil temperature and frost do not matter outdoors
  if (method === 'semenzaio') return { ...base, status: 'ora', period: active }

  // 1) Soil temperature: the table gives the window, the real soil decides inside it
  const need = crop.soilTempMin
  let warming = false
  if (c.soilNext !== null) {
    const nextOk = c.soilNext >= need
    const pastOk = c.soilPast === null || c.soilPast >= need
    if (!nextOk || (!pastOk && c.soilNext < need + 1)) return { ...base, status: 'rimanda', reason: 'suolo-freddo', period: active }
    warming = !pastOk
  }

  // 2) Frost in the coming nights: not forbidden, but flagged with day and minimum
  const threat = frostThreat(crop, c.frostNights)
  const late = crop.frost === 'sensibile' && Number(c.today.slice(5, 7)) <= 6 && c.lateFrostUntil && md <= c.lateFrostUntil ? c.lateFrostUntil : undefined
  if (threat) {
    return {
      ...base,
      status: 'attenzione',
      reason: 'gelo-previsto',
      period: active,
      warming,
      frost: { date: threat.morningDate, dayIndex: threat.dayIndex, tMinAir: threat.tMinAir, tMinGround: threat.tMinGround, level: threat.level },
    }
  }
  return { ...base, status: 'ora', period: active, warming, lateFrostUntil: late }
}

const ORDER: Record<SowStatus, number> = { ora: 0, attenzione: 1, rimanda: 2, presto: 3, fuori: 4 }

/** Advice for every technique of every crop, most actionable first. */
export function adviseAll(crops: Crop[], c: SowingConditions): MethodAdvice[] {
  const out: MethodAdvice[] = []
  for (const crop of crops) {
    for (const m of METHODS) {
      const periods = crop.periods[m]
      if (periods?.length) out.push(adviseMethod(crop, m, periods, c))
    }
  }
  return out.sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.startsIn ?? 0) - (b.startsIn ?? 0) || a.crop.name.localeCompare(b.crop.name, 'it'))
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null)

/** Mean soil temperature (6 cm) over the last 7 days and the next 5 days. */
export function soilTemps(hours: HourlyPoint[], nowLocal: string): { soilPast: number | null; soilNext: number | null } {
  const nowHour = nowLocal.slice(0, 13) + ':00'
  const i = hours.findIndex((h) => h.time >= nowHour)
  if (i < 0) return { soilPast: null, soilNext: null }
  const vals = (hs: HourlyPoint[]) => hs.map((h) => h.soilTemp6).filter((v): v is number => v !== null)
  return { soilPast: mean(vals(hours.slice(Math.max(0, i - 168), i))), soilNext: mean(vals(hours.slice(i, i + 120))) }
}

/** Groups the advice by crop and status (one row per crop, one line per technique), keeping the order. */
export function groupByCrop(list: MethodAdvice[]): MethodAdvice[][] {
  const groups = new Map<string, MethodAdvice[]>()
  for (const a of list) {
    const k = `${a.crop.id}|${a.status}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(a)
  }
  return [...groups.values()]
}
