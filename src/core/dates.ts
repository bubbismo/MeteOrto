/** Small date helpers on local "YYYY-MM-DD" strings (no timezone involved). */

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000)
}

/** Day of year (1-366) of a "YYYY-MM-DD" string. */
export function dayOfYear(date: string): number {
  return daysBetween(date.slice(0, 4) + '-01-01', date) + 1
}
