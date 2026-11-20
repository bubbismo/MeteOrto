import { fetchSowingWeather } from '../adapters/openmeteo/archive'
import { kvGet, kvSet } from '../adapters/storage/kv'
import { mergeEntries } from '../core/journal/backup'
import type { JournalEntry } from '../core/journal/types'
import { buildEntryWeather, needsWeather, weatherRange } from '../core/journal/weather'

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v))

/** The diary: entries and ignored suggestions, kept on the device. */
export class JournalStore {
  entries = $state<JournalEntry[]>([])
  dismissed = $state<string[]>([])
  loaded = $state(false)
  private refreshing = false

  async init(): Promise<void> {
    this.entries = (await kvGet<JournalEntry[]>('journal')) ?? []
    this.dismissed = (await kvGet<string[]>('journal:dismissed')) ?? []
    this.loaded = true
  }

  private persist(): void {
    void kvSet('journal', plain(this.entries))
    void kvSet('journal:dismissed', plain(this.dismissed))
  }

  add(e: JournalEntry): void {
    this.entries = [e, ...this.entries].sort((a, b) => b.sownOn.localeCompare(a.sownOn) || b.createdAt - a.createdAt)
    this.persist()
  }

  update(id: string, patch: Partial<JournalEntry>): void {
    this.entries = this.entries.map((e) => {
      if (e.id !== id) return e
      const next = { ...e, ...patch }
      // a different sowing date or place means the stored weather no longer applies
      if (patch.sownOn !== undefined && patch.sownOn !== e.sownOn) next.weather = undefined
      return next
    })
    this.persist()
  }

  remove(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id)
    this.persist()
  }

  dismiss(key: string): void {
    if (!this.dismissed.includes(key)) this.dismissed = [...this.dismissed, key]
    this.persist()
  }

  merge(incoming: JournalEntry[], dismissed: string[] = []): { added: number; updated: number } {
    const r = mergeEntries(this.entries, incoming)
    this.entries = r.entries
    this.dismissed = [...new Set([...this.dismissed, ...dismissed])]
    this.persist()
    return { added: r.added, updated: r.updated }
  }

  /** Downloads the post-sowing weather for entries that still need it (silently skipped when offline). */
  async refreshWeather(today: string): Promise<void> {
    if (this.refreshing) return
    this.refreshing = true
    try {
      for (const e of this.entries.filter((x) => needsWeather(x, today))) {
        const range = weatherRange(e.sownOn, today)
        if (!range) continue
        try {
          const days = await fetchSowingWeather(e, range.from, range.to)
          this.update(e.id, { weather: buildEntryWeather(days, e.sownOn, today) })
        } catch {
          // offline or rate limited: try again next time
        }
      }
    } finally {
      this.refreshing = false
    }
  }
}
