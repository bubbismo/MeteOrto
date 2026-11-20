/**
 * Remembers where the person was (screen, section of the garden tab, scroll position), so that a reload —
 * an app update, or the phone dropping the app from memory — brings them back to the same place.
 * After a while away the app starts from "Oggi" again, as people expect when they reopen it.
 */

export type Tab = 'oggi' | 'giorni' | 'pioggia' | 'orto' | 'impostazioni'
export type OrtoView = 'semine' | 'lavori' | 'diario'

export interface NavState {
  tab: Tab
  view: OrtoView
  scroll: number
  /** Epoch ms of the last change. */
  at: number
}

const KEY = 'meteorto.nav'
/** How long a saved position stays valid. */
export const NAV_MAX_AGE_MS = 30 * 60 * 1000

const TABS: Tab[] = ['oggi', 'giorni', 'pioggia', 'orto', 'impostazioni']
const VIEWS: OrtoView[] = ['semine', 'lavori', 'diario']
const DEFAULT: NavState = { tab: 'oggi', view: 'semine', scroll: 0, at: 0 }

/** Pure: reads a stored value and returns it only if it is valid and recent. */
export function parseNav(raw: string | null, now: number): NavState {
  if (!raw) return DEFAULT
  try {
    const v = JSON.parse(raw)
    if (!TABS.includes(v.tab) || typeof v.at !== 'number' || now - v.at > NAV_MAX_AGE_MS || v.at > now + 60000) return DEFAULT
    return {
      tab: v.tab,
      view: VIEWS.includes(v.view) ? v.view : 'semine',
      scroll: Number.isFinite(v.scroll) && v.scroll > 0 ? v.scroll : 0,
      at: v.at,
    }
  } catch {
    return DEFAULT
  }
}

let cache: NavState | null = null

export function loadNav(now = Date.now()): NavState {
  if (cache) return cache
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    // ignore
  }
  cache = parseNav(raw, now)
  return cache
}

export function saveNav(patch: Partial<Omit<NavState, 'at'>>, now = Date.now()): void {
  cache = { ...loadNav(now), ...patch, at: now }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}
