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

/** "MM-DD" of a "YYYY-MM-DD" date. */
export const monthDayOf = (date: string): string => date.slice(5, 10)

/** Days from `date` to the next occurrence of "MM-DD" (0 if it is today). */
export function daysUntilMonthDay(date: string, md: string): number {
  const year = Number(date.slice(0, 4))
  const thisYear = daysBetween(date, `${year}-${md}`)
  return thisYear >= 0 ? thisYear : daysBetween(date, `${year + 1}-${md}`)
}
