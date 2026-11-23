import type { Location } from '../../core/types'
import type { DailyMin } from '../../core/climate/frostStats'
import type { DayWater } from '../../core/irrigation/irrigation'
import type { DayWeather } from '../../core/journal/types'

const BASE = 'https://archive-api.open-meteo.com/v1/archive'

export interface DayHistory extends DayWater {
  tMin: number | null
  tMax: number | null
}

async function get(loc: Location, start: string, end: string, daily: string): Promise<any> {
  const p = new URLSearchParams({
    latitude: loc.lat.toFixed(4),
    longitude: loc.lon.toFixed(4),
    start_date: start,
    end_date: end,
    daily,
    timezone: 'auto',
  })
  const res = await fetch(`${BASE}?${p}`)
  if (!res.ok) throw new Error(`Archivio Open-Meteo: HTTP ${res.status}`)
  return res.json()
}

/** Daily rain, ET0 and temperatures between two dates (inclusive); the archive reaches up to yesterday. */
export async function fetchHistory(loc: Location, start: string, end: string): Promise<DayHistory[]> {
  const json = await get(loc, start, end, 'precipitation_sum,et0_fao_evapotranspiration,temperature_2m_min,temperature_2m_max')
  const d = json.daily
  const out: DayHistory[] = []
  ;(d.time as string[]).forEach((date, i) => {
    // the latest days may not be available yet: leave them out so that they are asked for again later
    if (d.precipitation_sum[i] === null || d.precipitation_sum[i] === undefined) return
    out.push({
      date,
      precip: d.precipitation_sum[i],
      et0: d.et0_fao_evapotranspiration[i] ?? 0,
      tMin: d.temperature_2m_min[i] ?? null,
      tMax: d.temperature_2m_max[i] ?? null,
    })
  })
  return out
}

export interface ClimateDay extends DailyMin {
  precip: number | null
}

/** Daily minimum temperature and rain over a range of full years, for frost and rain statistics (one request). */
export async function fetchDailyClimate(loc: Location, fromYear: number, toYear: number): Promise<ClimateDay[]> {
  const json = await get(loc, `${fromYear}-01-01`, `${toYear}-12-31`, 'temperature_2m_min,precipitation_sum')
  const d = json.daily
  return (d.time as string[]).map((date, i) => ({ date, tMin: d.temperature_2m_min[i] ?? null, precip: d.precipitation_sum[i] ?? null }))
}

/** Weather of the days after a sowing (archive): temperatures, rain and mean soil temperature at 0-7 cm. */
export async function fetchSowingWeather(place: { lat: number; lon: number }, start: string, end: string): Promise<DayWeather[]> {
  const json = await get(
    { ...place, elevation: null },
    start,
    end,
    'temperature_2m_min,temperature_2m_max,precipitation_sum,soil_temperature_0_to_7cm_mean',
  )
  const d = json.daily
  return (d.time as string[]).map((date, i) => ({
    date,
    tMin: d.temperature_2m_min[i] ?? null,
    tMax: d.temperature_2m_max[i] ?? null,
    precip: d.precipitation_sum[i] ?? 0,
    soil: d.soil_temperature_0_to_7cm_mean[i] ?? null,
  }))
}
