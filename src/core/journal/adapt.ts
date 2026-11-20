import { mdToDoy } from '../dates'
import { monthDayOf } from '../dates'
import type { Crop, Method, Period } from '../sowing/crops'
import type { JournalEntry } from './types'

export type SuggestionKind = 'estendi-fine' | 'estendi-inizio' | 'ritarda-inizio' | 'anticipa-fine'

export interface Suggestion {
  /** Stable key (crop, method, kind, period) to remember dismissed suggestions. */
  key: string
  cropId: string
  method: Method
  kind: SuggestionKind
  current: Period
  proposed: Period
  /** Years that confirm the result. */
  seasons: number[]
  /** The entries behind the suggestion. */
  entryIds: string[]
  /** Sowing dates that confirm it, "YYYY-MM-DD". */
  dates: string[]
}

export interface AdaptOptions {
  /** Seasons that must agree before a change is proposed (never below 2). */
  minSeasons?: number
  /** Outcome counts as good from this quality. */
  goodFrom?: number
  /** Outcome counts as bad up to this quality. */
  badUpTo?: number
  /** Ignore sowings farther than this from the window (they belong to another use). */
  maxDistanceDays?: number
  /** Failures within this many days from a window edge suggest narrowing it. */
  edgeDays?: number
}

interface Where {
  inside: boolean
  side: 'before' | 'after'
  /** Days from the nearest edge (0 inside). */
  days: number
  /** Days from the start of the window (inside only). */
  fromStart: number
  /** Days to the end of the window (inside only). */
  toEnd: number
}

function locate(md: string, p: Period): Where {
  const d = mdToDoy(md)
  const f = mdToDoy(p.from)
  const t = mdToDoy(p.to)
  const wraps = f > t
  const inside = wraps ? d >= f || d <= t : d >= f && d <= t
  const mod = (x: number) => ((x % 365) + 365) % 365
  if (inside) return { inside, side: 'before', days: 0, fromStart: mod(d - f), toEnd: mod(t - d) }
  const after = mod(d - t)
  const before = mod(f - d)
  return after <= before
    ? { inside, side: 'after', days: after, fromStart: 0, toEnd: 0 }
    : { inside, side: 'before', days: before, fromStart: 0, toEnd: 0 }
}

/** The window of the method that is closest to (or contains) a date. */
function nearestPeriod(md: string, periods: Period[]): { p: Period; w: Where } | null {
  let best: { p: Period; w: Where } | null = null
  for (const p of periods) {
    const w = locate(md, p)
    if (!best || w.days < best.w.days) best = { p, w }
  }
  return best
}

const year = (date: string) => Number(date.slice(0, 4))

/**
 * Suggests changes to the sowing table from the journal, only when enough different seasons
 * agree (default 3): good harvests from sowings outside a window suggest widening it; repeated
 * failures at the edge of a window suggest narrowing it.
 */
export function suggestChanges(entries: JournalEntry[], crops: Crop[], opts: AdaptOptions = {}): Suggestion[] {
  const minSeasons = Math.max(2, opts.minSeasons ?? 3)
  const goodFrom = opts.goodFrom ?? 4
  const badUpTo = opts.badUpTo ?? 2
  const maxDist = opts.maxDistanceDays ?? 60
  const edge = opts.edgeDays ?? 20
  const out: Suggestion[] = []

  const rated = entries.filter((e) => e.quality !== undefined)
  const keyOf = (e: JournalEntry) => `${e.cropId}|${e.method}`
  const groups = new Map<string, JournalEntry[]>()
  for (const e of rated) groups.set(keyOf(e), [...(groups.get(keyOf(e)) ?? []), e])

  for (const [k, list] of groups) {
    const [cropId, method] = k.split('|') as [string, Method]
    const crop = crops.find((c) => c.id === cropId)
    const periods = crop?.periods[method]
    if (!crop || !periods?.length) continue

    type Hit = { e: JournalEntry; p: Period; w: Where }
    const outsideGood = new Map<string, Hit[]>() // key: periodIndex|side
    const edgeBad = new Map<string, Hit[]>()

    for (const e of list) {
      const md = monthDayOf(e.sownOn)
      const near = nearestPeriod(md, periods)
      if (!near || near.w.days > maxDist) continue
      const idx = periods.indexOf(near.p)
      if (!near.w.inside && (e.quality as number) >= goodFrom) {
        const key = `${idx}|${near.w.side}`
        outsideGood.set(key, [...(outsideGood.get(key) ?? []), { e, ...near }])
      }
      if (near.w.inside && (e.quality as number) <= badUpTo) {
        const side = near.w.fromStart <= edge ? 'start' : near.w.toEnd <= edge ? 'end' : null
        if (side) edgeBad.set(`${idx}|${side}`, [...(edgeBad.get(`${idx}|${side}`) ?? []), { e, ...near }])
      }
    }

    // Widen: good results outside the window, in enough different years
    for (const [key, hits] of outsideGood) {
      const [idx, side] = [Number(key.split('|')[0]), key.split('|')[1]]
      const seasons = [...new Set(hits.map((h) => year(h.e.sownOn)))]
      if (seasons.length < minSeasons) continue
      const p = periods[idx]
      // the least extreme confirmed date: every confirming season supports it
      const dates = hits.map((h) => monthDayOf(h.e.sownOn))
      const sorted = [...dates].sort((a, b) => mdToDoy(a) - mdToDoy(b))
      if (side === 'after') {
        const to = sorted[0]
        out.push(make(cropId, method, 'estendi-fine', p, { ...p, to }, seasons, hits))
      } else {
        const from = sorted[sorted.length - 1]
        out.push(make(cropId, method, 'estendi-inizio', p, { ...p, from }, seasons, hits))
      }
    }

    // Narrow: repeated failures right at an edge, in years without a good result in the same zone
    for (const [key, hits] of edgeBad) {
      const [idx, side] = [Number(key.split('|')[0]), key.split('|')[1]]
      const p = periods[idx]
      const seasons = [...new Set(hits.map((h) => year(h.e.sownOn)))]
      const goodInZone = list.some((e) => {
        if ((e.quality as number) < goodFrom) return false
        const w = locate(monthDayOf(e.sownOn), p)
        return w.inside && (side === 'start' ? w.fromStart <= edge : w.toEnd <= edge)
      })
      if (seasons.length < minSeasons || goodInZone) continue
      const dates = hits.map((h) => monthDayOf(h.e.sownOn)).sort((a, b) => mdToDoy(a) - mdToDoy(b))
      if (side === 'start') {
        const next = nextDay(dates[dates.length - 1])
        if (mdToDoy(next) <= mdToDoy(p.to) || p.from > p.to) out.push(make(cropId, method, 'ritarda-inizio', p, { ...p, from: next }, seasons, hits))
      } else {
        const prev = prevDay(dates[0])
        out.push(make(cropId, method, 'anticipa-fine', p, { ...p, to: prev }, seasons, hits))
      }
    }
  }
  return out
}

function make(cropId: string, method: Method, kind: SuggestionKind, current: Period, proposed: Period, seasons: number[], hits: { e: JournalEntry }[]): Suggestion {
  return {
    key: `${cropId}|${method}|${kind}|${current.from}-${current.to}`,
    cropId,
    method,
    kind,
    current,
    proposed,
    seasons: seasons.sort(),
    entryIds: hits.map((h) => h.e.id),
    dates: hits.map((h) => h.e.sownOn).sort(),
  }
}

function shift(md: string, delta: number): string {
  const t = Date.UTC(2001, Number(md.slice(0, 2)) - 1, Number(md.slice(3, 5))) + delta * 86400000
  return new Date(t).toISOString().slice(5, 10)
}
const nextDay = (md: string) => shift(md, 1)
const prevDay = (md: string) => shift(md, -1)

/** The crop's periods with a suggestion applied (the matching window is replaced). */
export function applySuggestion(crop: Crop, s: Suggestion): Crop['periods'] {
  const list = (crop.periods[s.method] ?? []).map((p) => (p.from === s.current.from && p.to === s.current.to ? s.proposed : p))
  return { ...crop.periods, [s.method]: list }
}
