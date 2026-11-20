import * as SunCalc from 'suncalc'
import type { HorizonPoint, HorizonProfile } from '../types'

export interface SunWindow {
  /** Epoch ms. */
  start: number
  end: number
}

const MIN_WINDOW_MINUTES = 3

/** Obstruction height (degrees) at a compass azimuth, linearly interpolated around the circle. */
export function horizonAltitude(points: HorizonPoint[], az: number): number {
  const n = points.length
  if (n === 0) return 0
  if (n === 1) return points[0].alt
  const a = ((az % 360) + 360) % 360
  let hi = points.findIndex((p) => p.az > a)
  if (hi === -1) hi = 0 // beyond the last sample: wrap to the first
  const lo = (hi - 1 + n) % n
  const p0 = points[lo]
  const p1 = points[hi]
  const span = (p1.az - p0.az + 360) % 360 || 360
  const t = ((a - p0.az + 360) % 360) / span
  return p0.alt + (p1.alt - p0.alt) * t
}

/** Sun position: compass azimuth (0 = N, clockwise) and refraction-corrected altitude, both in degrees. */
export function sunPosition(date: Date, lat: number, lon: number): { azimuth: number; altitude: number } {
  const p = SunCalc.getPosition(date, lat, lon)
  return { azimuth: p.azimuth, altitude: p.altitude }
}

/** Epoch ms of a local ISO time ("2026-11-20T14:00") in a timezone given by its UTC offset. */
export function localToEpoch(localIso: string, utcOffsetSeconds: number): number {
  const iso = localIso.length === 16 ? localIso + ':00' : localIso
  return Date.parse(iso + 'Z') - utcOffsetSeconds * 1000
}

/** "HH:MM" of an epoch instant in the timezone given by its UTC offset. */
export function formatLocalTime(epochMs: number, utcOffsetSeconds: number): string {
  return new Date(epochMs + utcOffsetSeconds * 1000).toISOString().slice(11, 16)
}

/** True when the sun is above the geometric horizon (used to pick day or night icons). */
export function isDaylight(localIso: string, utcOffsetSeconds: number, lat: number, lon: number): boolean {
  return sunPosition(new Date(localToEpoch(localIso, utcOffsetSeconds)), lat, lon).altitude > -0.83
}

/**
 * Intervals of the local day in which the sun is above the real horizon profile.
 * Without a profile the horizon is flat (astronomical sunrise to sunset).
 */
export function directSunWindows(
  localDate: string,
  utcOffsetSeconds: number,
  lat: number,
  lon: number,
  horizon: HorizonProfile | null,
  stepMinutes = 1,
): SunWindow[] {
  const dayStart = localToEpoch(localDate + 'T00:00', utcOffsetSeconds)
  const step = stepMinutes * 60000
  const points = horizon?.points ?? []
  const windows: SunWindow[] = []
  let open: number | null = null
  for (let t = dayStart; t <= dayStart + 86400000; t += step) {
    const pos = sunPosition(new Date(t), lat, lon)
    const visible = pos.altitude > 0 && pos.altitude > horizonAltitude(points, pos.azimuth)
    if (visible && open === null) open = t
    if (!visible && open !== null) {
      windows.push({ start: open, end: t - step })
      open = null
    }
  }
  if (open !== null) windows.push({ start: open, end: dayStart + 86400000 })
  return windows.filter((w) => w.end - w.start >= MIN_WINDOW_MINUTES * 60000)
}

export function totalMinutes(windows: SunWindow[]): number {
  return Math.round(windows.reduce((a, w) => a + (w.end - w.start), 0) / 60000)
}

/**
 * Direct-sun minutes reduced by the forecast cloud cover hour by hour
 * (50% clouds halve the sunshine of that hour).
 */
export function effectiveSunMinutes(
  windows: SunWindow[],
  hours: { time: string; cloudCover: number | null }[],
  utcOffsetSeconds: number,
): number {
  let total = 0
  for (const h of hours) {
    const hs = localToEpoch(h.time, utcOffsetSeconds)
    const he = hs + 3600000
    let overlap = 0
    for (const w of windows) overlap += Math.max(0, Math.min(he, w.end) - Math.max(hs, w.start))
    total += (overlap / 60000) * (1 - (h.cloudCover ?? 0) / 100)
  }
  return Math.round(total)
}

export interface DaySun {
  windows: SunWindow[]
  directMinutes: number
  /** Direct sun reduced by forecast clouds. */
  effectiveMinutes: number
}

/** Direct-sun summary for one local day. `hours` are the forecast hours of that day. */
export function daySun(
  localDate: string,
  utcOffsetSeconds: number,
  lat: number,
  lon: number,
  horizon: HorizonProfile | null,
  hours: { time: string; cloudCover: number | null }[],
): DaySun {
  const windows = directSunWindows(localDate, utcOffsetSeconds, lat, lon, horizon)
  return {
    windows,
    directMinutes: totalMinutes(windows),
    effectiveMinutes: effectiveSunMinutes(windows, hours, utcOffsetSeconds),
  }
}
