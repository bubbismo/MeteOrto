import { describe, expect, it } from 'vitest'
import { EMPTY_USER_CROPS } from '../sowing/crops'
import { cleanEntry, makeBackup, mergeEntries, parseBackup, parseCsv, parseCsvRows, toCsv } from './backup'
import type { JournalEntry } from './types'

const e = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: 'a1', cropId: 'pomodoro', cropName: 'Pomodoro', emoji: '🍅', method: 'trapianto', sownOn: '2026-05-10',
  lat: 44.6, lon: 9.8, quality: 4, harvestFrom: '2026-08-01', harvestTo: '2026-09-15', notes: 'bello, "sano"\nsecondo giro', createdAt: 5, ...over,
})

describe('JSON backup', () => {
  it('round-trips journal, crops and settings', () => {
    const b = makeBackup({ journal: [e()], userCrops: EMPTY_USER_CROPS, settings: { soil: 'medio' }, dismissed: ['k'] }, new Date('2026-11-20T10:00:00Z'))
    const r = parseBackup(JSON.stringify(b))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.backup.journal).toEqual([e()])
      expect(r.backup.settings.soil).toBe('medio')
      expect(r.backup.dismissed).toEqual(['k'])
      expect(r.skipped).toBe(0)
    }
  })
  it('rejects wrong files with a clear message', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false })
    expect(parseBackup('{"foo":1}')).toMatchObject({ ok: false, error: expect.stringContaining('MeteOrto') })
    expect(parseBackup('{"app":"MeteOrto","version":99}')).toMatchObject({ ok: false })
  })
  it('skips broken entries but keeps the good ones', () => {
    const r = parseBackup(JSON.stringify({ app: 'MeteOrto', version: 1, journal: [e(), { id: 'bad' }, null, { ...e({ id: 'b' }), sownOn: '10/05/2026' }] }))
    expect(r.ok && r.backup.journal.map((x) => x.id)).toEqual(['a1'])
    expect(r.ok && r.skipped).toBe(3)
  })
})

describe('cleanEntry', () => {
  it('drops out-of-range quality and unknown methods', () => {
    expect(cleanEntry({ ...e(), quality: 9 })!.quality).toBeUndefined()
    expect(cleanEntry({ ...e(), method: 'volando' })).toBeNull()
  })
})

describe('mergeEntries', () => {
  it('adds new entries, lets the imported one win on the same id, and sorts newest first', () => {
    const r = mergeEntries([e(), e({ id: 'old', sownOn: '2025-04-01' })], [e({ quality: 2 }), e({ id: 'new', sownOn: '2026-06-01' })])
    expect(r).toMatchObject({ added: 1, updated: 1 })
    expect(r.entries.map((x) => x.id)).toEqual(['new', 'a1', 'old'])
    expect(r.entries.find((x) => x.id === 'a1')!.quality).toBe(2)
  })
})

describe('CSV', () => {
  it('escapes quotes, commas and newlines and reads them back', () => {
    const csv = toCsv([e()])
    expect(parseCsvRows(csv)[1][8]).toBe('bello, "sano"\nsecondo giro')
    const back = parseCsv(csv, { lat: 1, lon: 2 })
    expect(back.skipped).toBe(0)
    expect(back.entries[0]).toMatchObject({ id: 'a1', cropId: 'pomodoro', method: 'trapianto', sownOn: '2026-05-10', quality: 4, notes: 'bello, "sano"\nsecondo giro', lat: 1, lon: 2 })
  })
  it('includes a weather summary', () => {
    const w = { days: [{ date: 'd', tMin: -1, tMax: 9, precip: 3, soil: 7 }], complete: false, fetchedAt: 0 }
    const row = parseCsvRows(toCsv([e({ weather: w })]))[1]
    expect(row.slice(9)).toEqual(['7', '-1', '1', '3'])
  })
  it('counts unusable rows', () => {
    const r = parseCsv('id,data_semina,coltura_id,coltura,tecnica\nx,not-a-date,a,A,diretta\n', { lat: 0, lon: 0 })
    expect(r).toMatchObject({ entries: [], skipped: 1 })
  })
  it('handles Windows line endings and a BOM', () => {
    expect(parseCsvRows('﻿a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })
})
