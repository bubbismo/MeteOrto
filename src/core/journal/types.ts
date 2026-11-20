import type { Method } from '../sowing/crops'

/** Weather of one day after a sowing. */
export interface DayWeather {
  date: string
  tMin: number | null
  tMax: number | null
  /** Rain, mm. */
  precip: number
  /** Mean soil temperature 0-7 cm, °C. */
  soil: number | null
}

/** The 30 days that follow a sowing, saved automatically. */
export interface EntryWeather {
  days: DayWeather[]
  /** True once all 30 days are stored: no need to download again. */
  complete: boolean
  fetchedAt: number
}

export type Quality = 1 | 2 | 3 | 4 | 5

export interface JournalEntry {
  id: string
  cropId: string
  /** Snapshot, so the entry stays readable if the crop is renamed or removed. */
  cropName: string
  emoji: string
  method: Method
  /** Sowing / transplanting date, "YYYY-MM-DD". */
  sownOn: string
  /** Where it was sown (for the weather lookup). */
  lat: number
  lon: number
  harvestFrom?: string
  harvestTo?: string
  /** Harvest quality, 1 (poor) to 5 (excellent). */
  quality?: Quality
  notes?: string
  weather?: EntryWeather
  createdAt: number
}

export const WEATHER_DAYS = 30
