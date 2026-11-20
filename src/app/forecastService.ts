import { openMeteoForecast } from '../adapters/openmeteo/forecast'
import { kvGet, kvSet } from '../adapters/storage/kv'
import { combineForecast } from '../core/ensemble/ensemble'
import type { CombinedForecast, ForecastProvider, Location, RawForecast } from '../core/types'

const MAX_AGE_MS = 60 * 60 * 1000

export interface ForecastResult {
  raw: RawForecast
  combined: CombinedForecast
  /** Local ISO time used as "now" (location timezone). */
  nowLocal: string
  /** True when showing cached data because the download failed. */
  stale: boolean
}

function cacheKey(loc: Location): string {
  return `forecast:${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`
}

export function localNow(raw: RawForecast): string {
  return new Date(Date.now() + raw.utcOffsetSeconds * 1000).toISOString().slice(0, 16)
}

function build(raw: RawForecast, stale: boolean): ForecastResult {
  const nowLocal = localNow(raw)
  return { raw, combined: combineForecast(raw, nowLocal), nowLocal, stale }
}

/**
 * Returns the forecast for a location: fresh cache if recent, otherwise downloads it;
 * if the download fails, falls back to the last cached forecast (offline use).
 */
export async function loadForecast(
  loc: Location,
  opts: { force?: boolean; provider?: ForecastProvider } = {},
): Promise<ForecastResult> {
  const provider = opts.provider ?? openMeteoForecast
  const cached = await kvGet<RawForecast>(cacheKey(loc))
  if (cached && !opts.force && Date.now() - cached.fetchedAt < MAX_AGE_MS) return build(cached, false)
  try {
    const raw = await provider.fetchForecast(loc)
    await kvSet(cacheKey(loc), raw)
    return build(raw, false)
  } catch (err) {
    if (cached) return build(cached, true)
    throw err
  }
}
