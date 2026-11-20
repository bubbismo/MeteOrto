import { VARIABLES, type ForecastProvider, type Location, type ModelSeries, type RawForecast, type Variable } from '../../core/types'

export const MODELS = ['icon_d2', 'icon_eu', 'meteofrance_arome_france', 'ecmwf_ifs025', 'italia_meteo_arpae_icon_2i'] as const

const API_VARS: Record<Variable, string> = {
  temperature: 'temperature_2m',
  dewPoint: 'dew_point_2m',
  precipitation: 'precipitation',
  cloudCover: 'cloud_cover',
  windSpeed: 'wind_speed_10m',
  windGusts: 'wind_gusts_10m',
  et0: 'et0_fao_evapotranspiration',
  soilTemp0: 'soil_temperature_0cm',
  soilTemp6: 'soil_temperature_6cm',
}

/** Ingredients of severe convection, used for the hail alert. */
const CONVECTIVE_VARS = {
  cape: 'cape',
  wind500: 'wind_speed_500hPa',
  dir500: 'wind_direction_500hPa',
  dir10: 'wind_direction_10m',
  freezingLevel: 'freezing_level_height',
} as const

const PAST_DAYS = 7
const FORECAST_DAYS = 6

export function buildForecastUrl(loc: Location): string {
  const hourly = [...Object.values(API_VARS), 'weather_code', ...Object.values(CONVECTIVE_VARS)].join(',')
  const p = new URLSearchParams({
    latitude: loc.lat.toFixed(4),
    longitude: loc.lon.toFixed(4),
    hourly,
    models: MODELS.join(','),
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  })
  return `https://api.open-meteo.com/v1/forecast?${p}`
}

type Hourly = Record<string, (number | null)[] | string[]>

function column(hourly: Hourly, apiVar: string, model: string, n: number): (number | null)[] {
  const col = (hourly[`${apiVar}_${model}`] ?? []) as (number | null)[]
  return Array.from({ length: n }, (_, i) => col[i] ?? null)
}

/** Converts the raw Open-Meteo JSON into the core's RawForecast. Models without any data are dropped. */
export function parseForecast(json: any, fetchedAt: number): RawForecast {
  const hourly: Hourly = json.hourly
  const times = hourly.time as string[]
  const models: ModelSeries[] = []
  for (const model of MODELS) {
    const values = {} as Record<Variable, (number | null)[]>
    for (const v of VARIABLES) values[v] = column(hourly, API_VARS[v], model, times.length)
    if (values.temperature.every((x) => x === null)) continue
    const n = times.length
    models.push({
      model,
      values,
      weatherCode: column(hourly, 'weather_code', model, n),
      convective: {
        cape: column(hourly, CONVECTIVE_VARS.cape, model, n),
        wind500: column(hourly, CONVECTIVE_VARS.wind500, model, n),
        dir500: column(hourly, CONVECTIVE_VARS.dir500, model, n),
        dir10: column(hourly, CONVECTIVE_VARS.dir10, model, n),
        freezingLevel: column(hourly, CONVECTIVE_VARS.freezingLevel, model, n),
      },
    })
  }
  return { fetchedAt, utcOffsetSeconds: json.utc_offset_seconds ?? 0, times, models }
}

/** Open-Meteo refused the request because a usage limit was reached (free tier: per minute, hour or day). */
export class ApiLimitError extends Error {
  constructor(readonly scope: 'minuto' | 'ora' | 'giorno') {
    super(`Open-Meteo: limite di richieste raggiunto (${scope})`)
  }
}

/** Reads Open-Meteo's refusal text ("Daily API request limit exceeded…") into a limit scope, or null. */
export function parseLimitReason(reason: string | undefined): ApiLimitError['scope'] | null {
  const r = (reason ?? '').toLowerCase()
  if (!r.includes('limit')) return null
  if (r.includes('minut')) return 'minuto'
  if (r.includes('hour')) return 'ora'
  return 'giorno'
}

export const openMeteoForecast: ForecastProvider = {
  async fetchForecast(loc) {
    const res = await fetch(buildForecastUrl(loc))
    if (!res.ok) {
      if (res.status === 429) {
        const body = await res.json().catch(() => null)
        throw new ApiLimitError(parseLimitReason(body?.reason) ?? 'giorno')
      }
      throw new Error(`Open-Meteo: HTTP ${res.status}`)
    }
    const raw = parseForecast(await res.json(), Date.now())
    if (raw.models.length === 0) throw new Error('Open-Meteo: nessun modello disponibile per questo punto')
    return raw
  },
}
