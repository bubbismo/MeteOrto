import { buildRaySamples, horizonFromElevations } from '../../core/horizon/dem'
import { TILE_SIZE, bilinear, decodeTerrarium, tileFor, tileUrl, zoomForDistance } from '../../core/horizon/tiles'
import type { HorizonProvider } from '../../core/types'

/**
 * Elevation from the public "Terrarium" terrain tiles (Mapzen / AWS Open Data).
 * They have no request quota (unlike the Open-Meteo elevation API) and allow browser access.
 */

type Pixels = Uint8ClampedArray

const cache = new Map<string, Promise<Pixels>>()

async function loadTile(z: number, x: number, y: number): Promise<Pixels> {
  const key = `${z}/${x}/${y}`
  let p = cache.get(key)
  if (!p) {
    p = (async () => {
      const res = await fetch(tileUrl(z, x, y))
      if (!res.ok) throw new Error(`Rilievo: HTTP ${res.status}`)
      const bmp = await createImageBitmap(await res.blob())
      const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(bmp, 0, 0)
      return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data
    })()
    cache.set(key, p)
    p.catch(() => cache.delete(key))
  }
  return p
}

/** Downloads a set of tiles, a few at a time. */
async function loadAll(keys: { z: number; x: number; y: number }[], concurrency = 6): Promise<void> {
  const queue = [...keys]
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let t = queue.shift(); t; t = queue.shift()) await loadTile(t.z, t.x, t.y)
    }),
  )
}

/** Elevation at a point from tiles already loaded (bilinear between the four nearest pixels). */
async function elevation(lat: number, lon: number, z: number): Promise<number> {
  const t = tileFor(lat, lon, z)
  const data = await loadTile(t.z, t.x, t.y)
  const fx = t.px - 0.5
  const fy = t.py - 0.5
  const x0 = Math.max(0, Math.min(TILE_SIZE - 2, Math.floor(fx)))
  const y0 = Math.max(0, Math.min(TILE_SIZE - 2, Math.floor(fy)))
  const at = (x: number, y: number) => {
    const i = (y * TILE_SIZE + x) * 4
    return decodeTerrarium(data[i], data[i + 1], data[i + 2])
  }
  return bilinear(at(x0, y0), at(x0 + 1, y0), at(x0, y0 + 1), at(x0 + 1, y0 + 1), Math.max(0, Math.min(1, fx - x0)), Math.max(0, Math.min(1, fy - y0)))
}

/** Elevation of a point in metres, from terrain tiles (no quota). Null if the tile cannot be read. */
export async function terrainElevation(lat: number, lon: number): Promise<number | null> {
  try {
    return Math.round(await elevation(lat, lon, 11))
  } catch {
    return null
  }
}

/** Terrain horizon computed from terrain tiles: works offline-first in the browser and costs no API quota. */
export const terrainHorizon: HorizonProvider = {
  async fetchHorizon(loc) {
    const samples = buildRaySamples(loc.lat, loc.lon)
    // which tiles are needed, at which zoom: download them first, in parallel
    const need = new Map<string, { z: number; x: number; y: number }>()
    const origin = tileFor(loc.lat, loc.lon, 11)
    need.set(`${origin.z}/${origin.x}/${origin.y}`, origin)
    for (const s of samples) {
      const t = tileFor(s.lat, s.lon, zoomForDistance(s.d))
      need.set(`${t.z}/${t.x}/${t.y}`, t)
    }
    await loadAll([...need.values()])
    const z0 = await elevation(loc.lat, loc.lon, 11)
    const heights = await Promise.all(samples.map((s) => elevation(s.lat, s.lon, zoomForDistance(s.d))))
    const points = horizonFromElevations(
      z0,
      samples.map((s, i) => ({ az: s.az, d: s.d, z: heights[i] })),
    )
    return { source: 'dem', points }
  },
}
