import { describe, expect, it } from 'vitest'
import { buildRaySamples, destination, horizonFromElevations } from './dem'

describe('destination', () => {
  it('moves north by ~1 km', () => {
    const p = destination(44, 9, 0, 1000)
    expect(p.lat).toBeCloseTo(44 + 1000 / 111195, 4)
    expect(p.lon).toBeCloseTo(9, 5)
  })
  it('moves east along a parallel', () => {
    const p = destination(0, 9, 90, 111195)
    expect(p.lon).toBeCloseTo(10, 2)
  })
})

describe('buildRaySamples', () => {
  it('samples 36 azimuths x distances', () => {
    const s = buildRaySamples(44, 9)
    expect(s.length).toBe(36 * 15)
    expect(new Set(s.map((x) => x.az)).size).toBe(36)
  })
})

describe('horizonFromElevations', () => {
  it('finds a mountain to the south and a flat horizon elsewhere', () => {
    const samples = [
      { az: 180, d: 1000, z: 1000 + 577 }, // 30 degrees up
      { az: 180, d: 5000, z: 1000 + 100 },
      { az: 0, d: 1000, z: 1000 - 50 },
    ]
    const h = horizonFromElevations(1000, samples)
    expect(h.find((p) => p.az === 180)!.alt).toBeCloseTo(30, 0)
    expect(h.find((p) => p.az === 0)!.alt).toBe(0)
  })
  it('accounts for earth curvature on far, low terrain', () => {
    const h = horizonFromElevations(100, [{ az: 90, d: 25000, z: 100 }])
    expect(h[0].alt).toBe(0)
  })
})
