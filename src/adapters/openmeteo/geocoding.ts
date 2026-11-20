export interface Place {
  label: string
  lat: number
  lon: number
  elevation: number | null
}

/** Searches places by name (Open-Meteo geocoding, no API key). */
export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=it&format=json`,
  )
  if (!res.ok) throw new Error(`Geocoding: HTTP ${res.status}`)
  const json = await res.json()
  return (json.results ?? []).map((r: any) => ({
    label: [r.name, r.admin2 ?? r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    elevation: typeof r.elevation === 'number' ? r.elevation : null,
  }))
}
