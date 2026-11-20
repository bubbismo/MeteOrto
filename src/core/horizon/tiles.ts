/** Web-mercator tile maths and decoding of "Terrarium" elevation tiles (pure, no I/O). */

export const TILE_SIZE = 256

export interface TilePos {
  z: number
  x: number
  y: number
  /** Fractional pixel position inside the tile, 0 to 256. */
  px: number
  py: number
}

/** Tile and pixel that contain a point at a zoom level. */
export function tileFor(lat: number, lon: number, z: number): TilePos {
  const n = 2 ** z
  const latRad = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180
  const fx = ((lon + 180) / 360) * n
  const fy = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
  const x = Math.min(n - 1, Math.max(0, Math.floor(fx)))
  const y = Math.min(n - 1, Math.max(0, Math.floor(fy)))
  return { z, x, y, px: (fx - x) * TILE_SIZE, py: (fy - y) * TILE_SIZE }
}

/** Terrarium encoding: metres = R*256 + G + B/256 - 32768. */
export function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768
}

/**
 * Zoom to use for a point at a given distance from the observer: fine detail close by,
 * coarser tiles for far mountains (fewer, lighter downloads, same angular accuracy).
 */
export function zoomForDistance(distanceM: number): number {
  if (distanceM <= 4000) return 11
  if (distanceM <= 12000) return 10
  return 9
}

export const tileUrl = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

/** Bilinear interpolation of four neighbouring pixel elevations. */
export function bilinear(e00: number, e10: number, e01: number, e11: number, fx: number, fy: number): number {
  return e00 * (1 - fx) * (1 - fy) + e10 * fx * (1 - fy) + e01 * (1 - fx) * fy + e11 * fx * fy
}
