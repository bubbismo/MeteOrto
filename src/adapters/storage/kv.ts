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
  } catch {
    // storage unavailable (private mode, quota): the app keeps working without cache
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
