/** Shared domain types. The core never depends on UI or network code. */

export interface Location {
  lat: number
  lon: number
  /** Metres above sea level, when known. */
  elevation: number | null
}

export const VARIABLES = [
  'temperature',
  'dewPoint',
  'precipitation',
  'cloudCover',
  'windSpeed',
  'windGusts',
  'et0',
  'soilTemp0',
  'soilTemp6',
] as const
export type Variable = (typeof VARIABLES)[number]

/** Convective ingredients of one model (hail risk); arrays are aligned with RawForecast.times. */
export interface Convective {
  /** Convective available potential energy, J/kg. */
  cape: (number | null)[]
  /** Wind speed at 500 hPa (about 5.5 km), km/h, and its direction in degrees. */
  wind500: (number | null)[]
  dir500: (number | null)[]
  /** Direction of the wind at 10 m, degrees (its speed is in `values.windSpeed`). */
  dir10: (number | null)[]
  /** Height of the 0 °C level, m (not given by every model). */
  freezingLevel: (number | null)[]
}

/** Hourly values of a single weather model; arrays are aligned with RawForecast.times. */
export interface ModelSeries {
  model: string
  values: Record<Variable, (number | null)[]>
  weatherCode: (number | null)[]
  /** Missing in forecasts cached before the hail alert existed. */
  convective?: Convective
}

/** Normalised multi-model forecast, as returned by a ForecastProvider. */
export interface RawForecast {
  /** Epoch ms of the download. */
  fetchedAt: number
  utcOffsetSeconds: number
  /** Local ISO times ("2026-11-20T14:00"), shared by all models. */
  times: string[]
  models: ModelSeries[]
}

export interface ForecastProvider {
  fetchForecast(loc: Location): Promise<RawForecast>
}

export type Sky = 'sun' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog'

export interface HourlyPoint {
  time: string
  temperature: number | null
  dewPoint: number | null
  precipitation: number | null
  cloudCover: number | null
  windSpeed: number | null
  windGusts: number | null
  et0: number | null
  soilTemp0: number | null
  soilTemp6: number | null
  sky: Sky
  /** How many models contributed to this hour. */
  modelCount: number
}

export type ReliabilityLevel = 'alta' | 'media' | 'bassa'

export interface Reliability {
  /** 0-100 */
  score: number
  level: ReliabilityLevel
}

export interface DailySummary {
  /** Local date "YYYY-MM-DD". */
  date: string
  /** Days from today (0 = today). */
  dayIndex: number
  tMin: number | null
  tMax: number | null
  precipSum: number
  /** Reference evapotranspiration of the day, mm. */
  et0Sum: number
  windMax: number | null
  gustMax: number | null
  sky: Sky
  reliability: Reliability
}

export interface CombinedForecast {
  hours: HourlyPoint[]
  days: DailySummary[]
}

/** One sample of the horizon: compass azimuth (0 = N, 90 = E, 180 = S, 270 = W) and obstruction height in degrees. */
export interface HorizonPoint {
  az: number
  alt: number
}

export interface HorizonProfile {
  source: 'pvgis' | 'dem'
  /** Sorted by azimuth. */
  points: HorizonPoint[]
}

export interface HorizonProvider {
  fetchHorizon(loc: Location): Promise<HorizonProfile>
}

/** One reading of a personal weather station (hourly values, local time). */
export interface Observation {
  /** Local ISO hour, e.g. "2026-11-20T14:00". */
  time: string
  temperature?: number
  /** Rain over the hour, mm. */
  precipitation?: number
  /** Wind, km/h. */
  windSpeed?: number
}

/**
 * Source of real measurements (Ecowitt, Davis, Netatmo, a CSV file…).
 * Used to learn how far the models are off at this place and correct the forecast.
 */
export interface DataSource {
  id: string
  label: string
  fetchObservations(from: Date, to: Date): Promise<Observation[]>
}
