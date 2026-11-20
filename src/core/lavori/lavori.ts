import { daysUntilMonthDay, monthDayOf } from '../dates'
import type { FrostNight } from '../frost/frost'
import { inPeriod } from '../sowing/sowing'
import type { Period } from '../sowing/crops'
import type { WorkProfile, WorkWindow } from '../workwindows/workwindows'

export type TaskCategory =
  | 'pianificazione'
  | 'manutenzione'
  | 'concimazione'
  | 'semenzaio'
  | 'terreno'
  | 'semina'
  | 'trapianto'
  | 'difesa'
  | 'raccolto'

/** A garden job of the calendar (src/data/lavori.json). */
export interface Task {
  id: string
  title: string
  detail?: string
  category: TaskCategory
  period: Period
  /** The kind of dry, calm morning the job needs (see work windows). */
  profile?: WorkProfile
  /** The job is at risk when frost is forecast. */
  frostSensitive?: boolean
  /** Gardening tradition only. */
  moon?: 'crescente' | 'calante'
}

export interface TaskAdvice {
  task: Task
  status: 'ora' | 'presto'
  /** Days until the period starts (status "presto"). */
  startsIn?: number
  /** First good morning for this kind of job in the next days. */
  window: WorkWindow | null
  /** True when the job needs a dry morning but none is forecast in the next days. */
  noWindow: boolean
  /** Frost that threatens the job in the coming nights. */
  frost: FrostNight | null
}

export const TASK_SOON_DAYS = 14

/**
 * Jobs of the period, crossed with the forecast: the best morning for them and any frost warning.
 * `now` jobs first, then those starting within two weeks.
 */
export function tasksFor(tasks: Task[], today: string, work: WorkWindow[], frost: FrostNight[]): TaskAdvice[] {
  const md = monthDayOf(today)
  const risky = frost.find((n) => n.level !== 'nessuno') ?? null
  const out: TaskAdvice[] = []
  for (const task of tasks) {
    const active = inPeriod(md, task.period)
    const startsIn = active ? 0 : daysUntilMonthDay(today, task.period.from)
    if (!active && startsIn > TASK_SOON_DAYS) continue
    const windows = task.profile ? work.filter((w) => w.profile === task.profile) : []
    out.push({
      task,
      status: active ? 'ora' : 'presto',
      startsIn: active ? undefined : startsIn,
      window: windows[0] ?? null,
      noWindow: !!task.profile && windows.length === 0,
      frost: task.frostSensitive ? risky : null,
    })
  }
  return out.sort((a, b) => (a.status === b.status ? 0 : a.status === 'ora' ? -1 : 1) || (a.startsIn ?? 0) - (b.startsIn ?? 0))
}
