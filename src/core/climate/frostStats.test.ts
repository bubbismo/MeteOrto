import { describe, expect, it } from 'vitest'
import { frostAfterProbability, frostSeason, type DailyMin } from './frostStats'

/** One frost per year on the given dates; everything else is mild. */
function record(years: Record<number, { spring?: string; autumn?: string }>): DailyMin[] {
  const out: DailyMin[] = []
  for (const [y, ev] of Object.entries(years)) {
    out.push({ date: `${y}-01-15`, tMin: 5 })
    if (ev.spring) out.push({ date: `${y}-${ev.spring}`, tMin: -1 })
    out.push({ date: `${y}-04-30`, tMin: 6 })
    if (ev.autumn) out.push({ date: `${y}-${ev.autumn}`, tMin: -0.5 })
  }
  return out
}

describe('frostSeason', () => {
  const daily = record({
    2001: { spring: '03-20', autumn: '11-10' },
    2002: { spring: '03-30', autumn: '11-05' },
    2003: { spring: '04-10', autumn: '10-28' },
    2004: { spring: '04-20', autumn: '11-15' },
    2005: { spring: '03-25', autumn: '11-02' },
  })

  it('finds the median and extremes of the last spring frost', () => {
    const s = frostSeason(daily)
    expect(s.lastSpring!.earliest).toBe('03-20')
    expect(s.lastSpring!.median).toBe('03-30')
    expect(s.lastSpring!.latest).toBe('04-20')
  })

  it('finds the first autumn frost', () => {
    const s = frostSeason(daily)
    expect(s.firstAutumn!.earliest).toBe('10-28')
    expect(s.firstAutumn!.latest).toBe('11-15')
  })

  it('ignores days warmer than the threshold, and honours a higher one', () => {
    const d: DailyMin[] = [
      { date: '2001-04-05', tMin: 1.5 },
      { date: '2001-03-01', tMin: -2 },
    ]
    expect(frostSeason(d, 0).lastSpring!.latest).toBe('03-01')
    expect(frostSeason(d, 2).lastSpring!.latest).toBe('04-05')
  })

  it('handles missing values and empty records', () => {
    expect(frostSeason([{ date: '2001-01-05', tMin: null }]).lastSpring).toBeNull()
    expect(frostSeason([]).years).toBe(0)
  })

  it('gives the chance of another spring frost after a date', () => {
    const s = frostSeason(daily)
    expect(frostAfterProbability(s, '2026-03-01', 5)).toBe(1)
    expect(frostAfterProbability(s, '2026-04-05', 5)).toBeCloseTo(0.4) // 04-10 and 04-20
    expect(frostAfterProbability(s, '2026-04-25', 5)).toBe(0)
  })

  it('treats leap years like normal years', () => {
    const d: DailyMin[] = [
      { date: '2004-03-20', tMin: -1 }, // leap
      { date: '2003-03-20', tMin: -1 },
    ]
    expect(frostSeason(d).lastSpring!.earliest).toBe('03-20')
    expect(frostSeason(d).lastSpring!.latest).toBe('03-20')
  })
})
