import { buildRaySamples, horizonFromElevations } from '../../core/horizon/dem'
import type { HorizonProvider } from '../../core/types'

const CHUNK = 100 // Open-Meteo elevation API accepts up to 100 coordinates per call

async function elevations(coords: { lat: number; lon: number }[]): Promise<number[]> {
  const out: number[] = []
  for (let i = 0; i < coords.length; i += CHUNK) {
    const part = coords.slice(i, i + CHUNK)
    const lat = part.map((c) => c.lat.toFixed(5)).join(',')
    const lon = part.map((c) => c.lon.toFixed(5)).join(',')
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
    if (!res.ok) throw new Error(`Elevation: HTTP ${res.status}`)
    const json = await res.json()
    out.push(...(json.elevation as number[]))
  }
  return out
}

/** Terrain horizon computed from the Open-Meteo elevation model (works from the browser, no setup). */
export const demHorizon: HorizonProvider = {
  async fetchHorizon(loc) {
    const samples = buildRaySamples(loc.lat, loc.lon)
    const z = await elevations([{ lat: loc.lat, lon: loc.lon }, ...samples])
    const z0 = z[0]
    const points = horizonFromElevations(
      z0,
      samples.map((s, i) => ({ az: s.az, d: s.d, z: z[i + 1] })),
    )
    return { source: 'dem', points }
  },
}
