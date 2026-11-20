import { describe, expect, it } from 'vitest'
import { effectiveRain, irrigationAdvice, soilMoisture, type DayWater } from './irrigation'

const days = (n: number, precip: number, et0: number): DayWater[] =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-07-${String(i + 1).padStart(2, '0')}`, precip, et0 }))

const base = { rainNext48: 0, reliability: 'alta' as const, tMaxToday: 28, soil: 'medio' as const }

describe('effectiveRain', () => {
  it('ignores drizzle and trims the rest', () => {
    expect(effectiveRain(0.6)).toBe(0)
    expect(effectiveRain(10)).toBeCloseTo(9)
  })
})

describe('soilMoisture', () => {
  it('dries during a hot dry spell, down to zero', () => {
    expect(soilMoisture(days(14, 0, 6), 'medio')).toBe(0)
  })
  it('is capped at capacity after heavy rain', () => {
    expect(soilMoisture(days(3, 40, 1), 'medio')).toBe(25)
  })
  it('sandy soil dries earlier than clay', () => {
    const d = days(4, 0, 3)
    expect(soilMoisture(d, 'sabbioso') / 15).toBeLessThan(soilMoisture(d, 'argilloso') / 35)
  })
})

describe('irrigationAdvice', () => {
  it('says to water after a dry hot week with no rain coming', () => {
    const a = irrigationAdvice({ ...base, past: days(14, 0, 5) })
    expect(a.action).toBe('annaffia')
    expect(a.urgent).toBe(true)
    expect(a.suggestedMm).toBeGreaterThanOrEqual(5)
  })

  it('says not needed after recent rain', () => {
    const past = [...days(10, 0, 4), ...days(2, 20, 1)]
    const a = irrigationAdvice({ ...base, past })
    expect(a.action).toBe('non-serve')
    expect(a.reason).toBe('terreno-umido')
  })

  it('waits when real rain is forecast and models agree', () => {
    const a = irrigationAdvice({ ...base, past: days(14, 0, 4), rainNext48: 12 })
    expect(a.action).toBe('aspetta')
    expect(a.reason).toBe('pioggia-in-arrivo')
  })

  it('does not wait for rain the models disagree on', () => {
    const a = irrigationAdvice({ ...base, past: days(14, 0, 4), rainNext48: 12, reliability: 'bassa' })
    expect(a.action).toBe('annaffia')
  })

  it('does not suggest watering on a cold day', () => {
    const a = irrigationAdvice({ ...base, past: days(14, 0, 0.3), tMaxToday: 3 })
    expect(a.action).toBe('non-serve')
    expect(a.reason).toBe('freddo')
  })

  it('reports the rain fallen in the last 7 days', () => {
    const a = irrigationAdvice({ ...base, past: [...days(7, 2, 3)] })
    expect(a.rainLast7).toBe(14)
  })
})

describe('irrigationAdvice rainLast7 override', () => {
  it('uses the provided completed-days total', () => {
    const a = irrigationAdvice({ ...base, past: days(7, 1, 3), rainLast7: 49 })
    expect(a.rainLast7).toBe(49)
  })
})
