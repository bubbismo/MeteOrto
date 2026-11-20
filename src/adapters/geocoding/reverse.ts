/**
 * Name of the nearest place for a point (OpenStreetMap Nominatim, free, allowed from browsers).
 * Called once per chosen location: respect the service's fair-use policy (no bulk or repeated requests).
 */

interface NominatimAddress {
  hamlet?: string
  village?: string
  town?: string
  city?: string
  municipality?: string
  suburb?: string
  county?: string
}

/**
 * Picks a short, friendly place name from a Nominatim reverse-geocoding answer:
 * "Hamlet, Municipality" for the countryside, the municipality alone otherwise.
 * Returns null when the answer has nothing usable.
 */
export function pickPlaceName(json: { address?: NominatimAddress } | null | undefined): string | null {
  const a = json?.address
  if (!a) return null
  const comune = a.village ?? a.town ?? a.city ?? a.municipality
  const local = a.hamlet
  if (local && comune && local !== comune) return `${local}, ${comune}`
  return local ?? comune ?? a.suburb ?? a.county ?? null
}

export async function reverseGeocode(lat: number, lon: number, timeoutMs = 5000): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&addressdetails=1&accept-language=it&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    return pickPlaceName(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
