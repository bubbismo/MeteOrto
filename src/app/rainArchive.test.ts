import { describe, expect, it } from 'vitest'
import { missingDays, span } from './rainArchive'

describe('missingDays', () => {
  it('lists the days not stored yet, in order', () => {
    expect(missingDays({ '2026-11-02': 1, '2026-11-04': 1 }, '2026-11-01', '2026-11-05')).toEqual(['2026-11-01', '2026-11-03', '2026-11-05'])
  })
  it('is empty when everything is there or the range is empty', () => {
    expect(missingDays({ '2026-11-01': 1 }, '2026-11-01', '2026-11-01')).toEqual([])
    expect(missingDays({}, '2026-11-02', '2026-11-01')).toEqual([])
  })
})

describe('span', () => {
  it('finds the first and last date', () => {
    expect(span(['2026-11-03', '2026-11-01', '2026-11-09'])).toEqual({ from: '2026-11-01', to: '2026-11-09' })
    expect(span([])).toBeNull()
  })
})
