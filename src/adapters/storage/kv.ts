import { openDB, type IDBPDatabase } from 'idb'
import type { Location } from '../../core/types'

/** Local persistence: IndexedDB for bulky data (cache, journal), localStorage for the small settings. */

let dbPromise: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB('meteorto', 1, {
    upgrade(d) {
      d.createObjectStore('kv')
    },
  })
  return dbPromise
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await (await db()).get('kv', key)) as T | undefined
  } catch {
    return undefined
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    await (await db()).put('kv', value, key)
  } catch (err) {
    // storage unavailable (private mode, quota): the app keeps working without it
    console.warn(`Salvataggio locale non riuscito (${key}):`, err)
  }
}

const LOCATION_KEY = 'meteorto.location'

export function loadLocation(): Location | null {
  try {
    const s = localStorage.getItem(LOCATION_KEY)
    return s ? (JSON.parse(s) as Location) : null
  } catch {
    return null
  }
}

export function saveLocation(loc: Location): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc))
  } catch {
    // ignore
  }
}

const PROXY_KEY = 'meteorto.pvgisProxy'

/** Optional address of the PVGIS proxy (Cloudflare Worker). */
export function loadProxyUrl(): string {
  try {
    return localStorage.getItem(PROXY_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveProxyUrl(url: string): void {
  try {
    if (url) localStorage.setItem(PROXY_KEY, url)
    else localStorage.removeItem(PROXY_KEY)
  } catch {
    // ignore
  }
}

const SOIL_KEY = 'meteorto.soil'

export function loadSoil(): 'sabbioso' | 'medio' | 'argilloso' {
  try {
    const v = localStorage.getItem(SOIL_KEY)
    return v === 'sabbioso' || v === 'argilloso' ? v : 'medio'
  } catch {
    return 'medio'
  }
}

export function saveSoil(v: 'sabbioso' | 'medio' | 'argilloso'): void {
  try {
    localStorage.setItem(SOIL_KEY, v)
  } catch {
    // ignore
  }
}
