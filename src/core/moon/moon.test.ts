import { describe, expect, it } from 'vitest'
import { moonAt, moonMonth, nextMainPhase } from './moon'

describe('moonAt', () => {
  it('recognises a known new moon (6 Jan 2000) and full moon (21 Jan 2000)', () => {
    expect(moonAt(new Date('2000-01-06T18:14:00Z')).name).toBe('nuova')
    expect(moonAt(new Date('2000-01-21T04:40:00Z')).name).toBe('piena')
  })
  it('is waxing in the first half of the cycle and waning in the second', () => {
    expect(moonAt('2026-11-20').waxing).toBe(true) // a few days before the full moon
    expect(moonAt('2026-12-02').waxing).toBe(false)
  })
  it('reports the illuminated fraction', () => {
    expect(moonAt(new Date('2000-01-21T04:40:00Z')).illumination).toBeGreaterThan(0.99)
  })
})

describe('moonMonth', () => {
  it('has one entry per day and runs through the whole cycle', () => {
    const m = moonMonth(2026, 11)
    expect(m).toHaveLength(30)
    expect(new Set(m.map((d) => d.name)).size).toBeGreaterThanOrEqual(7)
  })
})

describe('nextMainPhase', () => {
  it('finds the next full moon within a few days', () => {
    const n = nextMainPhase('2026-11-20')
    expect(n.kind).toBe('piena')
    expect(n.inDays).toBeGreaterThanOrEqual(3)
    expect(n.inDays).toBeLessThanOrEqual(6)
  })
  it('finds the following new moon from a waning date', () => {
    expect(nextMainPhase('2026-12-02').kind).toBe('nuova')
  })
})
