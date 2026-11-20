import type { HorizonPoint } from '../types'

/** Computes the terrain horizon from elevation samples along rays (pure geometry, no I/O). */

const EARTH_RADIUS = 6371000
/** Share of the curvature drop left after atmospheric refraction. */
const REFRACTION_FACTOR = 0.87

export const AZIMUTH_STEP = 10
export const DISTANCES = [100, 200, 350, 500, 750, 1000, 1500, 2000, 3000, 4500, 6500, 9000, 13000, 18000, 25000]

export interface RaySample {
  az: number
  d: number
  lat: number
  lon: number
}

/** Point reached from (lat, lon) travelling distM metres along a compass bearing. */
export function destination(lat: number, lon: number, bearingDeg: number, distM: number): { lat: number; lon: number } {
  const rad = Math.PI / 180
  const δ = distM / EARTH_RADIUS
  const θ = bearingDeg * rad
  const φ1 = lat * rad
  const λ1 = lon * rad
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  return { lat: φ2 / rad, lon: ((λ2 / rad + 540) % 360) - 180 }
}

export function buildRaySamples(lat: number, lon: number): RaySample[] {
  const out: RaySample[] = []
  for (let az = 0; az < 360; az += AZIMUTH_STEP) {
    for (const d of DISTANCES) out.push({ az, d, ...destination(lat, lon, az, d) })
  }
  return out
}

/** Highest apparent elevation angle of the terrain in each direction, as seen from an observer at height z0. */
export function horizonFromElevations(z0: number, samples: { az: number; d: number; z: number }[]): HorizonPoint[] {
  const best = new Map<number, number>()
  for (const s of samples) {
    const drop = (REFRACTION_FACTOR * s.d * s.d) / (2 * EARTH_RADIUS)
    const angle = (Math.atan2(s.z - z0 - drop, s.d) * 180) / Math.PI
    best.set(s.az, Math.max(best.get(s.az) ?? 0, angle))
  }
  return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([az, alt]) => ({ az, alt: Math.round(alt * 10) / 10 }))
}
