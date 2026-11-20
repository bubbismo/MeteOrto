/** Elevation in metres for a point, or null if the service is unreachable. */
export async function fetchElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`)
    if (!res.ok) return null
    const json = await res.json()
    const v = json?.elevation?.[0]
    return typeof v === 'number' ? v : null
  } catch {
    return null
  }
}
