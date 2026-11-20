/** Garden crops table: model, validation and merging of the user's own changes. */

export type Method = 'semenzaio' | 'diretta' | 'trapianto'
export const METHODS: Method[] = ['semenzaio', 'diretta', 'trapianto']

/** A calendar window, both ends as "MM-DD". When `from` is after `to` the window wraps over New Year. */
export interface Period {
  from: string
  to: string
}

export type FrostSensitivity = 'resistente' | 'tollerante' | 'sensibile'
export type MoonPref = 'crescente' | 'calante' | 'indifferente'

export interface Crop {
  id: string
  name: string
  emoji: string
  family: string
  /** Windows in which each technique is possible (seedbed, direct sowing, transplanting). */
  periods: Partial<Record<Method, Period[]>>
  /** Minimum soil temperature (°C, at about 6 cm) to sow in the ground or to transplant. */
  soilTempMin: number
  frost: FrostSensitivity
  depthCm: number
  /** [between rows, along the row] in cm. */
  spacingCm: [number, number]
  /** Days to germinate, [min, max]. */
  germinationDays: [number, number]
  /** Days from sowing (or transplant, for crops started in a seedbed) to harvest. */
  harvestDays: [number, number]
  /** Gardening tradition only, never decisive. */
  moon: MoonPref
  notes?: string
  /** True for crops added by the user. */
  custom?: boolean
}

const MD = /^(\d{2})-(\d{2})$/

export function isMonthDay(s: string): boolean {
  const m = MD.exec(s)
  if (!m) return false
  const month = Number(m[1])
  const day = Number(m[2])
  if (month < 1 || month > 12) return false
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  return day >= 1 && day <= days
}

/** Problems found in a crop definition (empty when valid). */
export function validateCrop(c: Crop): string[] {
  const errors: string[] = []
  if (!c.id) errors.push('manca id')
  if (!c.name.trim()) errors.push(`${c.id}: manca il nome`)
  for (const m of METHODS) {
    for (const p of c.periods[m] ?? []) {
      if (!isMonthDay(p.from) || !isMonthDay(p.to)) errors.push(`${c.id}: periodo non valido (${m}: ${p.from} → ${p.to})`)
    }
  }
  if (!Number.isFinite(c.soilTempMin)) errors.push(`${c.id}: soglia del terreno non valida`)
  return errors
}

export interface UserCrops {
  /** Changes to built-in crops, by id (only the changed fields). */
  overrides: Record<string, Partial<Crop>>
  /** Crops added by the user. */
  custom: Crop[]
}

export const EMPTY_USER_CROPS: UserCrops = { overrides: {}, custom: [] }

/** Built-in crops with the user's changes applied, followed by the user's own crops. */
export function mergeCrops(base: Crop[], user: UserCrops): Crop[] {
  const merged = base.map((c) => ({ ...c, ...(user.overrides[c.id] ?? {}), id: c.id }))
  return [...merged, ...user.custom.map((c) => ({ ...c, custom: true }))]
}

/** Which fields of a built-in crop the user has changed (for the "modificata" badge and the reset). */
export function isModified(id: string, user: UserCrops): boolean {
  return Object.keys(user.overrides[id] ?? {}).length > 0
}

export function newCustomCrop(name: string, emoji: string): Crop {
  return {
    id: `custom-${Date.now().toString(36)}`,
    name,
    emoji: emoji || '🌱',
    family: 'Personalizzata',
    periods: {},
    soilTempMin: 10,
    frost: 'tollerante',
    depthCm: 1,
    spacingCm: [30, 20],
    germinationDays: [7, 14],
    harvestDays: [60, 90],
    moon: 'indifferente',
    custom: true,
  }
}
