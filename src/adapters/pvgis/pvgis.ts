import type { HorizonPoint, HorizonProfile, HorizonProvider } from '../../core/types'

/**
 * PVGIS reports azimuth as 0 = South, positive towards West, negative towards East.
 * Converts to compass azimuth (0 = North, clockwise).
 */
export function parsePvgisHorizon(json: any): HorizonProfile {
  const raw = json?.outputs?.horizon_profile
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('PVGIS: profilo orizzonte non valido')
  const points: HorizonPoint[] = raw
    .map((p: { A: number; H_hor: number }) => ({ az: (((p.A + 180) % 360) + 360) % 360, alt: p.H_hor }))
    .sort((a: HorizonPoint, b: HorizonPoint) => a.az - b.az)
  return { source: 'pvgis', points }
}

/**
 * PVGIS does not send CORS headers, so browsers cannot call it directly:
 * `proxyUrl` is the address of the Cloudflare Worker in /worker (see worker/README.md).
 */
export function pvgisHorizon(proxyUrl: string): HorizonProvider {
  return {
    async fetchHorizon(loc) {
      const url = new URL(proxyUrl)
      url.searchParams.set('lat', loc.lat.toFixed(5))
      url.searchParams.set('lon', loc.lon.toFixed(5))
      const res = await fetch(url)
      if (!res.ok) throw new Error(`PVGIS: HTTP ${res.status}`)
      return parsePvgisHorizon(await res.json())
    },
  }
}
