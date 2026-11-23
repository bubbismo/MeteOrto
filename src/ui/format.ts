const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const SKY_LABEL = {
  sun: 'Sole',
  partly: 'Poco nuvoloso',
  cloudy: 'Nuvoloso',
  rain: 'Pioggia',
  storm: 'Temporale',
  snow: 'Neve',
  fog: 'Nebbia',
} as const

export const skyLabel = (s: keyof typeof SKY_LABEL, night = false) => (night && s === 'sun' ? 'Sereno' : SKY_LABEL[s])
export const deg = (v: number | null) => (v === null ? '–' : `${Math.round(v)}°`)
/** Millimetres the Italian way: "4,2", "33". */
export const mm = (v: number) => (v < 0.1 ? '0' : v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v)))
/** Always one decimal: "33,0". */
export const mm1 = (v: number) => v.toFixed(1).replace('.', ',')

export function dayName(date: string, dayIndex: number): string {
  if (dayIndex === 0) return 'Oggi'
  if (dayIndex === 1) return 'Domani'
  return WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()]
}

export function duration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`
}

export function ageLabel(fetchedAt: number): string {
  const min = Math.round((Date.now() - fetchedAt) / 60000)
  if (min < 2) return 'aggiornata ora'
  if (min < 60) return `aggiornata ${min} min fa`
  const h = Math.round(min / 60)
  return h < 24 ? `aggiornata ${h} h fa` : `aggiornata ${Math.round(h / 24)} g fa`
}

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const WEEKDAYS_FULL = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

/** "04-25" -> "25 apr" */
export function monthDay(md: string): string {
  return `${Number(md.slice(3, 5))} ${MONTHS[Number(md.slice(0, 2)) - 1]}`
}

export function weekdayFull(date: string): string {
  return WEEKDAYS_FULL[new Date(date + 'T12:00:00Z').getUTCDay()]
}

/** "2026-05-10" -> "10 mag 2026" */
export function fullDate(date: string): string {
  return `${monthDay(date.slice(5, 10))} ${date.slice(0, 4)}`
}

const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
export const monthName = (m: number) => MONTH_NAMES[m - 1]
export const monthShort = (m: number) => MONTH_NAMES[m - 1].slice(0, 3)

/** "2026-11-22" -> "Dom" */
export const weekdayShort = (date: string): string => WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()]

/** "2026-11-22" -> "Sab 22 nov" */
export function dayLabel(date: string): string {
  const wd = WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()]
  return `${wd} ${Number(date.slice(8, 10))} ${monthShort(Number(date.slice(5, 7)))}`
}

/** "2026-11-22" -> "Sabato 22 novembre" */
export function dayFull(date: string): string {
  const wd = weekdayFull(date)
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${Number(date.slice(8, 10))} ${monthName(Number(date.slice(5, 7)))}`
}
