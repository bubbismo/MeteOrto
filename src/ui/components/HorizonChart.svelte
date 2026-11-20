<script lang="ts">
  import { formatLocalTime, horizonAltitude, localToEpoch, sunPosition } from '../../core/sun/sun'
  import type { HorizonProfile } from '../../core/types'

  let {
    horizon,
    date = null,
    utcOffsetSeconds = 0,
    lat = 0,
    lon = 0,
    nowEpoch = null,
  }: {
    horizon: HorizonProfile | null
    /** Local date "YYYY-MM-DD": when set, the sun path of that day is drawn. */
    date?: string | null
    utcOffsetSeconds?: number
    lat?: number
    lon?: number
    nowEpoch?: number | null
  } = $props()

  const W = 340
  const H = 190
  const AZ_MIN = 40
  const AZ_MAX = 320
  const GROUND = 26 // height of the foreground garden strip
  const SCALE = 1.5 // px per degree of altitude
  const x = (az: number) => ((az - AZ_MIN) / (AZ_MAX - AZ_MIN)) * W
  const y = (alt: number) => H - GROUND - Math.min(alt, 75) * SCALE
  // The observer: bottom centre, where the light fan converges
  const P = { x: W / 2, y: H - GROUND + 6 }

  const ridge = $derived.by(() => {
    if (!horizon) return { d: '', peak: null as { x: number; y: number; alt: number } | null }
    let d = `M${x(AZ_MIN)},${y(0)}`
    let peak: { x: number; y: number; alt: number } | null = null
    for (let az = AZ_MIN; az <= AZ_MAX; az += 2) {
      const alt = horizonAltitude(horizon.points, az)
      d += ` L${x(az).toFixed(1)},${y(alt).toFixed(1)}`
      if (!peak || alt > peak.alt) peak = { x: x(az), y: y(alt), alt }
    }
    return { d: d + ` L${x(AZ_MAX)},${y(0)} Z`, peak: peak && peak.alt >= 3 ? peak : null }
  })

  interface Pt {
    x: number
    y: number
    t: number
  }
  interface Run {
    visible: boolean
    pts: Pt[]
  }

  const sky = $derived.by(() => {
    const runs: Run[] = []
    let now: Pt | null = null
    let nowVisible = false
    if (!date) return { runs, now, nowVisible }
    const start = localToEpoch(date + 'T00:00', utcOffsetSeconds)
    let cur = null as Run | null
    for (let t = start; t <= start + 86400000; t += 60000) {
      const p = sunPosition(new Date(t), lat, lon)
      if (p.altitude < 0 || p.azimuth < AZ_MIN || p.azimuth > AZ_MAX) {
        cur = null
        continue
      }
      const visible = p.altitude > horizonAltitude(horizon?.points ?? [], p.azimuth)
      const pt = { x: x(p.azimuth), y: y(p.altitude), t }
      if (!cur || cur.visible !== visible) {
        const prev: Pt | undefined = cur?.pts[cur.pts.length - 1]
        cur = { visible, pts: prev ? [prev, pt] : [pt] }
        runs.push(cur)
      } else cur.pts.push(pt)
    }
    // 1-minute sampling keeps the times exact; thin the points to keep the drawing light
    for (const r of runs) r.pts = r.pts.filter((p, i) => i === 0 || i === r.pts.length - 1 || p.t % (5 * 60000) === 0)
    if (nowEpoch !== null) {
      const p = sunPosition(new Date(nowEpoch), lat, lon)
      if (p.altitude > 0 && p.azimuth >= AZ_MIN && p.azimuth <= AZ_MAX) {
        now = { x: x(p.azimuth), y: y(p.altitude), t: nowEpoch }
        nowVisible = p.altitude > horizonAltitude(horizon?.points ?? [], p.azimuth)
      }
    }
    return { runs, now, nowVisible }
  })

  const line = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fan = (pts: Pt[]) => `M${P.x},${P.y} ` + pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
  const clampX = (v: number) => Math.min(W - 22, Math.max(22, v))
  const hhmm = (t: number) => formatLocalTime(t, utcOffsetSeconds)
</script>

<figure>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="Orizzonte e percorso del sole">
    <defs>
      <linearGradient id="hc-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6ec6ff" />
        <stop offset="0.7" stop-color="#cdeeff" />
        <stop offset="1" stop-color="#fff3cf" />
      </linearGradient>
      <linearGradient id="hc-ridge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7fa3a6" />
        <stop offset="1" stop-color="#6e9a66" />
      </linearGradient>
      <linearGradient id="hc-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#58a04a" />
        <stop offset="1" stop-color="#2f6b2f" />
      </linearGradient>
      <linearGradient id="hc-fan" gradientUnits="userSpaceOnUse" x1="0" y1={H * 0.4} x2="0" y2={P.y}>
        <stop offset="0" stop-color="#ffd54a" stop-opacity="0.7" />
        <stop offset="1" stop-color="#ffd54a" stop-opacity="0.35" />
      </linearGradient>
      <radialGradient id="hc-glow">
        <stop offset="0" stop-color="#fff59d" stop-opacity="0.9" />
        <stop offset="1" stop-color="#ffb627" stop-opacity="0" />
      </radialGradient>
    </defs>

    <rect width={W} height={H} fill="url(#hc-sky)" rx="16" />

    <!-- altitude guides -->
    {#each [20, 40, 60] as a}
      <line x1="0" x2={W} y1={y(a)} y2={y(a)} stroke="#fff" stroke-opacity="0.7" stroke-dasharray="2 5" />
      <text x="6" y={y(a) - 3} font-size="9" fill="#5a7d99">{a}°</text>
    {/each}

    <!-- distant terrain: the real horizon seen from the garden -->
    <path d={ridge.d} fill="url(#hc-ridge)" stroke="#4d7a54" stroke-width="1.5" stroke-linejoin="round" />
    {#if ridge.peak}
      <text x={Math.min(W - 20, ridge.peak.x)} y={ridge.peak.y + 14} text-anchor="middle" font-size="10" fill="#1f3d2a" font-weight="700">▲ {Math.round(ridge.peak.alt)}°</text>
    {/if}

    <!-- sun path -->
    {#each sky.runs as r}
      {#if r.visible}
        <path d={fan(r.pts)} fill="url(#hc-fan)" />
        <path d={line(r.pts)} fill="none" stroke="#ffb627" stroke-opacity="0.35" stroke-width="12" stroke-linecap="round" />
        <path d={line(r.pts)} fill="none" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round" />
        <text class="t" x={clampX(r.pts[0].x)} y={r.pts[0].y - 10} text-anchor="middle">{hhmm(r.pts[0].t)}</text>
        <text class="t" x={clampX(r.pts[r.pts.length - 1].x)} y={r.pts[r.pts.length - 1].y - 10} text-anchor="middle">{hhmm(r.pts[r.pts.length - 1].t)}</text>
      {:else}
        <path d={line(r.pts)} fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="2.5" stroke-dasharray="3 5" stroke-linecap="round" />
      {/if}
    {/each}

    <!-- sun now, with a beam towards the garden when it shines directly -->
    {#if sky.now}
      {#if sky.nowVisible}
        <path d={`M${sky.now.x - 5},${sky.now.y} L${P.x - 14},${P.y} L${P.x + 14},${P.y} L${sky.now.x + 5},${sky.now.y} Z`} fill="#fff176" fill-opacity="0.7" />
        <circle cx={sky.now.x} cy={sky.now.y} r="22" fill="url(#hc-glow)" />
        <circle cx={sky.now.x} cy={sky.now.y} r="8" fill="#ffb627" stroke="#fff" stroke-width="2" />
      {:else}
        <circle cx={sky.now.x} cy={sky.now.y} r="7" fill="#cfd8dc" stroke="#fff" stroke-width="2" />
      {/if}
    {/if}

    <!-- foreground: the garden -->
    <rect x="0" y={H - GROUND} width={W} height={GROUND} fill="url(#hc-ground)" />
    <path d={`M0,${H - GROUND} H${W}`} stroke="#8bc34a" stroke-width="2" />
    <text x={P.x} y={H - GROUND + 4} text-anchor="middle" font-size="15">🌱</text>
    {#each [[90, 'Est'], [180, 'Sud'], [270, 'Ovest']] as [az, label]}
      <text x={x(az as number)} y={H - 8} text-anchor="middle" font-size="10" fill="#fff" font-weight="700">{label}</text>
    {/each}
    <rect width={W} height={H} fill="none" stroke="#fff" stroke-opacity="0.6" rx="16" />
  </svg>

  {#if date}
    <figcaption>
      <span><i class="g"></i>sole diretto</span>
      <span><i class="d"></i>coperto dal rilievo</span>
      <span><i class="m"></i>montagne e colline</span>
    </figcaption>
  {:else}
    <figcaption><span><i class="m"></i>le montagne e colline che vedi dall’orto, da Est a Ovest</span></figcaption>
  {/if}
</figure>

<style>
  figure { margin: 0; }
  .t { font-size: 11px; font-weight: 700; fill: #6b3f00; paint-order: stroke; stroke: #fff; stroke-width: 3px; stroke-linejoin: round; }
  svg { width: 100%; height: auto; display: block; }
  figcaption { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.75rem; opacity: 0.85; margin-top: 6px; }
  span { display: inline-flex; align-items: center; gap: 5px; }
  i { display: inline-block; width: 18px; height: 6px; border-radius: 3px; }
  .g { background: #ff9f1c; }
  .d { background: repeating-linear-gradient(90deg, #9fb3c0 0 3px, transparent 3px 6px); }
  .m { background: #6e9a66; height: 10px; }
</style>
