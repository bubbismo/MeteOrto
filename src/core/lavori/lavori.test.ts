import { describe, expect, it } from 'vitest'
import lavori from '../../data/lavori.json'
import type { FrostNight } from '../frost/frost'
import { isMonthDay } from '../sowing/crops'
import type { WorkWindow } from '../workwindows/workwindows'
import { tasksFor, type Task } from './lavori'

const tasks = lavori as unknown as Task[]

describe('lavori.json', () => {
  it('has unique ids and valid periods', () => {
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length)
    for (const t of tasks) {
      expect(isMonthDay(t.period.from), t.id).toBe(true)
      expect(isMonthDay(t.period.to), t.id).toBe(true)
      expect(t.title.length, t.id).toBeGreaterThan(5)
    }
  })
  it('has something to do in every month', () => {
    for (let m = 1; m <= 12; m++) {
      const today = `2026-${String(m).padStart(2, '0')}-15`
      expect(tasksFor(tasks, today, [], []).filter((a) => a.status === 'ora').length, `month ${m}`).toBeGreaterThan(0)
    }
  })
})

const t = (over: Partial<Task>): Task => ({ id: 'x', title: 'Lavoro di prova', category: 'terreno', period: { from: '04-01', to: '04-30' }, ...over })
const win = (profile: WorkWindow['profile']): WorkWindow => ({ profile, date: '2026-04-11', dayIndex: 1, start: '06:00', end: '12:00', hours: 6 })
const night = (level: FrostNight['level']): FrostNight => ({
  morningDate: '2026-04-12', dayIndex: 2, tMinAir: 1, tMinGround: -2, level, confidence: 'alta',
  factors: { clearSky: true, calm: true, dryAir: true }, firstFrostTime: null,
})

describe('tasksFor', () => {
  const today = '2026-04-10'
  it('lists jobs of the period first, then those starting within two weeks, and hides the rest', () => {
    const list = tasksFor(
      [t({ id: 'later', period: { from: '04-20', to: '05-10' } }), t({ id: 'now' }), t({ id: 'far', period: { from: '09-01', to: '09-30' } })],
      today, [], [],
    )
    expect(list.map((a) => `${a.task.id}:${a.status}`)).toEqual(['now:ora', 'later:presto'])
    expect(list[1].startsIn).toBe(10)
  })

  it('attaches the first suitable morning for the job profile', () => {
    const a = tasksFor([t({ profile: 'trattamenti' })], today, [win('lavori'), win('trattamenti')], [])[0]
    expect(a.window?.profile).toBe('trattamenti')
    expect(a.noWindow).toBe(false)
  })

  it('says when no suitable morning is forecast', () => {
    const a = tasksFor([t({ profile: 'trattamenti' })], today, [win('lavori')], [])[0]
    expect(a).toMatchObject({ window: null, noWindow: true })
  })

  it('does not require a morning for jobs without a profile', () => {
    expect(tasksFor([t({})], today, [], [])[0].noWindow).toBe(false)
  })

  it('warns about frost only for frost-sensitive jobs', () => {
    const risky = [night('probabile')]
    expect(tasksFor([t({ frostSensitive: true })], today, [], risky)[0].frost?.dayIndex).toBe(2)
    expect(tasksFor([t({})], today, [], risky)[0].frost).toBeNull()
    expect(tasksFor([t({ frostSensitive: true })], today, [], [night('nessuno')])[0].frost).toBeNull()
  })

  it('handles year-wrapping periods', () => {
    const a = tasksFor([t({ period: { from: '11-15', to: '02-28' } })], '2026-01-10', [], [])[0]
    expect(a.status).toBe('ora')
  })
})
