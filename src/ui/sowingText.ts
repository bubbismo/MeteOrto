import type { Method } from '../core/sowing/crops'
import type { MethodAdvice } from '../core/sowing/sowing'
import { deg, monthDay, weekdayFull } from './format'

export const METHOD_LABEL: Record<Method, string> = { semenzaio: 'Semenzaio', diretta: 'Semina', trapianto: 'Trapianto' }

const VERB: Record<Method, string> = { semenzaio: 'Semina in semenzaio', diretta: 'Semina in campo', trapianto: 'Trapianta' }

const md = (s: string) => monthDay(s)

function frostWhen(a: MethodAdvice): string {
  const f = a.frost!
  const when = f.dayIndex === 0 ? 'stamattina' : f.dayIndex === 1 ? 'stanotte' : weekdayFull(f.date)
  return `${when}: minima ${deg(f.tMinAir)}, sul terreno ${deg(f.tMinGround)}`
}

/** One-line explanation for the list. */
export function headline(a: MethodAdvice): string {
  const p = a.period
  switch (a.status) {
    case 'ora':
      return a.warming
        ? `${VERB[a.method]} ora: il terreno si sta scaldando`
        : `${VERB[a.method]} ora${p ? ` · periodo fino al ${md(p.to)}` : ''}`
    case 'rimanda':
      return `Aspetta: terreno a ${deg(a.soilNext)}, servono ${deg(a.soilNeeded)}`
    case 'attenzione':
      return `Periodo giusto, ma gelata ${frostWhen(a)}`
    case 'presto':
      return `Dal ${md(p!.from)} (tra ${a.startsIn} giorni)`
    default:
      return p ? `Periodo: ${md(p.from)} – ${md(p.to)}` : ''
  }
}

/** Longer advice shown when the row is opened. */
export function advice(a: MethodAdvice): string[] {
  const out: string[] = []
  const p = a.period
  if (a.status === 'rimanda' && p) {
    out.push(`Il periodo abituale è dal ${md(p.from)} al ${md(p.to)}, ma negli ultimi 7 giorni il terreno è a ${deg(a.soilPast)} e nei prossimi 5 a ${deg(a.soilNext)}: l’indicazione di semina è spostata in avanti.`)
    out.push('Seminare adesso rallenta la germinazione e fa marcire i semi.')
  }
  if (a.status === 'attenzione') {
    out.push(`Gelata prevista ${frostWhen(a)}.`)
    out.push(
      a.method === 'diretta'
        ? 'Rimanda di qualche giorno. Se semini lo stesso, rinforza la pacciamatura e tieni pronto tessuto non tessuto o un tunnel per coprire le piantine appena nate.'
        : 'Rimanda di qualche giorno, oppure copri subito le piantine con tessuto non tessuto o tunnel e metti la pacciamatura intorno al colletto.',
    )
  }
  if (a.status === 'ora' && a.lateFrostUntil) {
    out.push(`Nel tuo orto le gelate tardive sono ancora possibili fino al ${md(a.lateFrostUntil)} (1 anno su 10): tieni pronto un telo.`)
  }
  if (a.status === 'ora' && a.warming) out.push(`Negli ultimi 7 giorni il terreno era ancora fresco (${deg(a.soilPast)}), ma le previsioni lo danno in salita (${deg(a.soilNext)}).`)
  return out
}
