// Cloudflare Worker: forwards requests to the PVGIS "printhorizon" API adding CORS headers,
// because PVGIS does not allow calls from browsers. Free plan is more than enough.

const PVGIS = 'https://re.jrc.ec.europa.eu/api/v5_3/printhorizon'

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? ''
    const allowed = env.ALLOWED_ORIGIN || '*'
    const cors = {
      'Access-Control-Allow-Origin': allowed === '*' || origin === allowed ? (allowed === '*' ? '*' : origin) : 'null',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get('lat'))
    const lon = Number(searchParams.get('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return new Response(JSON.stringify({ error: 'lat/lon non validi' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const upstream = await fetch(`${PVGIS}?lat=${lat}&lon=${lon}&outputformat=json`, {
      cf: { cacheTtl: 30 * 24 * 3600, cacheEverything: true }, // the horizon never changes
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=2592000' },
    })
  },
}
