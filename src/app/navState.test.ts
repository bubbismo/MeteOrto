import { describe, expect, it } from 'vitest'
import { NAV_MAX_AGE_MS, parseNav } from './navState'

const NOW = 1_800_000_000_000
const saved = (over = {}) => JSON.stringify({ tab: 'giorni', view: 'diario', scroll: 420, at: NOW - 60_000, ...over })

describe('parseNav', () => {
  it('restores a recent position', () => {
    expect(parseNav(saved(), NOW)).toEqual({ tab: 'giorni', view: 'diario', scroll: 420, at: NOW - 60_000 })
  })
  it('starts from Oggi after a long absence', () => {
    expect(parseNav(saved({ at: NOW - NAV_MAX_AGE_MS - 1 }), NOW).tab).toBe('oggi')
  })
  it('ignores empty, broken or unknown values', () => {
    expect(parseNav(null, NOW).tab).toBe('oggi')
    expect(parseNav('not json', NOW).tab).toBe('oggi')
    expect(parseNav(saved({ tab: 'inesistente' }), NOW).tab).toBe('oggi')
  })
  it('falls back for a bad section or scroll value', () => {
    const n = parseNav(saved({ view: 'x', scroll: -5 }), NOW)
    expect(n).toMatchObject({ tab: 'giorni', view: 'semine', scroll: 0 })
  })
  it('ignores a timestamp from the future', () => {
    expect(parseNav(saved({ at: NOW + 3_600_000 }), NOW).tab).toBe('oggi')
  })
})
