export type ParseResult =
  | { ok: true; lat: number; lon: number }
  | { ok: false; reason: 'empty' | 'short-link' | 'invalid' | 'out-of-range' }

const NUM = '-?\\d{1,3}(?:\\.\\d+)?'

function build(lat: string, lon: string): ParseResult {
  const la = Number(lat)
  const lo = Number(lon)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return { ok: false, reason: 'invalid' }
  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return { ok: false, reason: 'out-of-range' }
  return { ok: true, lat: la, lon: lo }
}

/**
 * Extracts coordinates from text copied from Google Maps:
 * "44.68630, 9.85680", or a full Google Maps link.
 */
export function parseLocation(input: string): ParseResult {
  let text = input.trim()
  if (!text) return { ok: false, reason: 'empty' }
  try {
    text = decodeURIComponent(text)
  } catch {
    // keep raw text
  }

  // Plain "lat, lon"
  const plain = text.match(new RegExp(`^(${NUM})\\s*[,;\\s]\\s*(${NUM})$`))
  if (plain) return build(plain[1], plain[2])

  // Exact pin in Google Maps data parameter: !3d<lat>!4d<lon>
  const pin = text.match(new RegExp(`!3d(${NUM})!4d(${NUM})`))
  if (pin) return build(pin[1], pin[2])

  // Map centre: @lat,lon,zoom
  const at = text.match(new RegExp(`@(${NUM}),(${NUM})`))
  if (at) return build(at[1], at[2])

  // Query parameters: q=, ll=, query=, center=, destination=
  const query = text.match(new RegExp(`[?&](?:q|ll|query|center|destination)=(${NUM})[,+\\s]+(${NUM})`))
  if (query) return build(query[1], query[2])

  // Any decimal pair inside a URL, e.g. /place/44.68,9.85
  if (/^https?:\/\//i.test(text)) {
    const any = text.match(new RegExp(`(${NUM.replace('(?:\\.\\d+)?', '\\.\\d+')}),\\s*(${NUM.replace('(?:\\.\\d+)?', '\\.\\d+')})`))
    if (any) return build(any[1], any[2])
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text)) return { ok: false, reason: 'short-link' }
  }
  return { ok: false, reason: 'invalid' }
}
