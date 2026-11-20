import { demHorizon } from '../adapters/openmeteo/demHorizon'
import { pvgisHorizon } from '../adapters/pvgis/pvgis'
import { kvGet, kvSet } from '../adapters/storage/kv'
import type { HorizonProfile, Location } from '../core/types'

function cacheKey(loc: Location): string {
  return `horizon:${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`
}

/**
 * Horizon profile of a location, computed once and kept on the device.
 * Uses PVGIS when a proxy is configured, otherwise (or if PVGIS fails) the terrain model.
 */
export async function loadHorizon(
  loc: Location,
  opts: { force?: boolean; proxyUrl?: string | null } = {},
): Promise<HorizonProfile> {
  const cached = await kvGet<HorizonProfile>(cacheKey(loc))
  // a PVGIS profile is kept; a terrain one is replaced as soon as a proxy becomes available
  if (cached && !opts.force && !(cached.source === 'dem' && opts.proxyUrl)) return cached

  let profile: HorizonProfile | null = null
  if (opts.proxyUrl) {
    try {
      profile = await pvgisHorizon(opts.proxyUrl).fetchHorizon(loc)
    } catch {
      profile = null
    }
  }
  profile ??= await demHorizon.fetchHorizon(loc)
  await kvSet(cacheKey(loc), profile)
  return profile
}
