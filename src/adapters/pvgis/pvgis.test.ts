import { describe, expect, it } from 'vitest'
import { parsePvgisHorizon } from './pvgis'

describe('parsePvgisHorizon', () => {
  it('converts PVGIS azimuth (0 = S) to compass azimuth (0 = N) and sorts', () => {
    const h = parsePvgisHorizon({
      outputs: {
        horizon_profile: [
          { A: -180, H_hor: 11 }, // north
          { A: -90, H_hor: 5 }, // east
          { A: 0, H_hor: 20 }, // south
          { A: 90, H_hor: 7 }, // west
        ],
      },
    })
    expect(h.source).toBe('pvgis')
    expect(h.points).toEqual([
      { az: 0, alt: 11 },
      { az: 90, alt: 5 },
      { az: 180, alt: 20 },
      { az: 270, alt: 7 },
    ])
  })
  it('rejects malformed answers', () => {
    expect(() => parsePvgisHorizon({})).toThrow()
  })
})
