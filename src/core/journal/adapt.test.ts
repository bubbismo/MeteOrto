import { describe, expect, it } from 'vitest'
import { newCustomCrop, type Crop } from '../sowing/crops'
import { applySuggestion, suggestChanges } from './adapt'
import type { JournalEntry, Quality } from './types'

const beans: Crop = {
  ...newCustomCrop('Fagiolini', '🫘'),
  id: 'fagiolino',
  periods: { diretta: [{ from: '04-25', to: '08-15' }] },
}

let n = 0
const entry = (sownOn: string, quality?: Quality, over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `e${++n}`,
  cropId: 'fagiolino',
  cropName: 'Fagiolini',
  emoji: '🫘',
  method: 'diretta',
  sownOn,
  lat: 44,
  lon: 9,
  quality,
  createdAt: 0,
  ...over,
})

describe('suggestChanges: widening', () => {
  it('extends the window when three seasons got good harvests from early September sowings', () => {
    const s = suggestChanges([entry('2023-09-03', 5), entry('2024-09-08', 4), entry('2025-09-01', 4)], [beans])
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ kind: 'estendi-fine', proposed: { from: '04-25', to: '09-01' }, seasons: [2023, 2024, 2025] })
  })

  it('is cautious: two seasons are not enough by default', () => {
    expect(suggestChanges([entry('2024-09-03', 5), entry('2025-09-05', 4)], [beans])).toEqual([])
  })

  it('can be told to accept two seasons, but never fewer', () => {
    const e = [entry('2024-09-03', 5), entry('2025-09-05', 4)]
    expect(suggestChanges(e, [beans], { minSeasons: 2 })).toHaveLength(1)
    expect(suggestChanges([entry('2025-09-03', 5)], [beans], { minSeasons: 1 })).toEqual([])
  })

  it('counts different seasons, not different entries of the same year', () => {
    const e = [entry('2025-09-01', 5), entry('2025-09-03', 5), entry('2025-09-06', 4)]
    expect(suggestChanges(e, [beans])).toEqual([])
  })

  it('ignores poor results and sowings far outside the window', () => {
    expect(suggestChanges([entry('2023-09-03', 2), entry('2024-09-03', 1), entry('2025-09-03', 2)], [beans])).toEqual([])
    expect(suggestChanges([entry('2023-12-20', 5), entry('2024-12-20', 5), entry('2025-12-20', 5)], [beans])).toEqual([])
  })

  it('ignores entries without a harvest rating', () => {
    expect(suggestChanges([entry('2023-09-03'), entry('2024-09-03'), entry('2025-09-03')], [beans])).toEqual([])
  })

  it('extends the start for good early sowings', () => {
    const s = suggestChanges([entry('2023-04-15', 4), entry('2024-04-12', 5), entry('2025-04-18', 4)], [beans])
    expect(s[0]).toMatchObject({ kind: 'estendi-inizio', proposed: { from: '04-18', to: '08-15' } })
  })
})

describe('suggestChanges: narrowing', () => {
  it('suggests starting later when early sowings keep failing', () => {
    const s = suggestChanges([entry('2023-04-28', 1), entry('2024-05-02', 2), entry('2025-04-30', 1)], [beans])
    expect(s).toHaveLength(1)
    expect(s[0].kind).toBe('ritarda-inizio')
    expect(s[0].proposed.from).toBe('05-03')
  })
  it('does not narrow if a good result exists in the same zone', () => {
    const s = suggestChanges([entry('2023-04-28', 1), entry('2024-05-02', 2), entry('2025-04-30', 1), entry('2025-04-27', 5)], [beans])
    expect(s).toEqual([])
  })
})

describe('applySuggestion', () => {
  it('replaces only the matching window', () => {
    const [s] = suggestChanges([entry('2023-09-03', 5), entry('2024-09-08', 4), entry('2025-09-01', 4)], [beans])
    expect(applySuggestion(beans, s).diretta).toEqual([{ from: '04-25', to: '09-01' }])
  })
})
