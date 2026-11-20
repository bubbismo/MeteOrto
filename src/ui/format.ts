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

export const skyLabel = (s: keyof typeof SKY_LABEL) => SKY_LABEL[s]
export const deg = (v: number | null) => (v === null ? '–' : `${Math.round(v)}°`)
export const mm = (v: number) => (v < 0.1 ? '0' : v < 10 ? v.toFixed(1) : String(Math.round(v)))

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
