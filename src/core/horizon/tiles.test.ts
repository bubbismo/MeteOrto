import { describe, expect, it } from 'vitest'
import { bilinear, decodeTerrarium, tileFor, tileUrl, zoomForDistance } from './tiles'

describe('tileFor', () => {
  it('finds the right tile for a known point', () => {
    // Piacenza apennines, zoom 11: verified against the standard slippy-map formula
    expect(tileFor(44.6863, 9.8568, 11)).toMatchObject({ z: 11, x: 1080, y: 739 })
  })
  it('puts the pixel inside the tile', () => {
    const t = tileFor(44.6863, 9.8568, 11)
    expect(t.px).toBeGreaterThanOrEqual(0)
    expect(t.px).toBeLessThan(256)
    expect(t.py).toBeGreaterThanOrEqual(0)
    expect(t.py).toBeLessThan(256)
  })
  it('handles the date line and the poles without leaving the grid', () => {
    expect(tileFor(0, -180, 3)).toMatchObject({ x: 0 })
    expect(tileFor(0, 179.999, 3).x).toBe(7)
    expect(tileFor(89.9, 0, 3).y).toBe(0)
  })
  it('a lower zoom contains the tile of a higher zoom', () => {
    const hi = tileFor(44.6863, 9.8568, 11)
    const lo = tileFor(44.6863, 9.8568, 9)
    expect(Math.floor(hi.x / 4)).toBe(lo.x)
    expect(Math.floor(hi.y / 4)).toBe(lo.y)
  })
})

describe('decodeTerrarium', () => {
  it('decodes sea level, mountains and below sea level', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0)
    expect(decodeTerrarium(137, 192, 0)).toBe(9 * 256 + 192) // 2496 m
    expect(decodeTerrarium(130, 184, 128)).toBeCloseTo(2 * 256 + 184 + 0.5)
    expect(decodeTerrarium(127, 255, 0)).toBe(-1)
  })
})

describe('zoomForDistance', () => {
  it('uses coarser tiles farther away', () => {
    expect(zoomForDistance(100)).toBe(11)
    expect(zoomForDistance(8000)).toBe(10)
    expect(zoomForDistance(25000)).toBe(9)
  })
})

describe('bilinear', () => {
  it('interpolates between four values', () => {
    expect(bilinear(0, 10, 0, 10, 0.5, 0.5)).toBe(5)
    expect(bilinear(1, 2, 3, 4, 0, 0)).toBe(1)
    expect(bilinear(1, 2, 3, 4, 1, 1)).toBe(4)
  })
})

describe('tileUrl', () => {
  it('points to the public terrain tiles', () => {
    expect(tileUrl(11, 1080, 739)).toBe('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/11/1080/739.png')
  })
})
