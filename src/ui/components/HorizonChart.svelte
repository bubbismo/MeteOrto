<script lang="ts">
  import { horizonAltitude, localToEpoch, sunPosition } from '../../core/sun/sun'
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

  const W = 300
  const H = 110
  const AZ_MIN = 40
  const AZ_MAX = 320
  const x = (az: number) => ((az - AZ_MIN) / (AZ_MAX - AZ_MIN)) * W
  const y = (alt: number) => H - 14 - Math.min(alt, 70) * 1.25

  const ground = $derived.by(() => {
    if (!horizon) return ''
    let d = `M${x(AZ_MIN)},${H}`
    for (let az = AZ_MIN; az <= AZ_MAX; az += 2) d += ` L${x(az).toFixed(1)},${y(horizonAltitude(horizon.points, az)).toFixed(1)}`
    return d + ` L${x(AZ_MAX)},${H} Z`
  })

  interface Seg {
    d: string
    visible: boolean
  }
  const path = $derived.by(() => {
    const segs: Seg[] = []
    let now: { x: number; y: number } | null = null
    if (!date) return { segs, now }
    const start = localToEpoch(date + 'T00:00', utcOffsetSeconds)
    let cur: Seg | null = null
    for (let t = start; t <= start + 86400000; t += 10 * 60000) {
      const p = sunPosition(new Date(t), lat, lon)
      if (p.altitude < 0 || p.azimuth < AZ_MIN || p.azimuth > AZ_MAX) {
        cur = null
        continue
      }
      const vis = p.altitude > horizonAltitude(horizon?.points ?? [], p.azimuth)
      const pt = `${x(p.azimuth).toFixed(1)},${y(p.altitude).toFixed(1)}`
      if (!cur || cur.visible !== vis) {
        const prev: string | null = cur ? cur.d.split(' ').pop()!.replace('L', '') : null
        cur = { d: `M${prev ?? pt} L${pt}`, visible: vis }
        segs.push(cur)
      } else cur.d += ` L${pt}`
    }
    if (nowEpoch !== null) {
      const p = sunPosition(new Date(nowEpoch), lat, lon)
      if (p.altitude > 0 && p.azimuth >= AZ_MIN && p.azimuth <= AZ_MAX) now = { x: x(p.azimuth), y: y(p.altitude) }
    }
    return { segs, now }
  })
</script>

<svg viewBox="0 0 {W} {H}" role="img" aria-label="Orizzonte e percorso del sole">
  <rect width={W} height={H} fill="#e8f6ff" rx="14" />
  {#each path.segs as s}
    <path d={s.d} fill="none" stroke={s.visible ? '#ff9f1c' : '#b0a58a'} stroke-width={s.visible ? 4 : 2} stroke-linecap="round" stroke-dasharray={s.visible ? '' : '3 4'} />
  {/each}
  <path d={ground} fill="#8bc34a" stroke="#558b2f" stroke-width="1.5" />
  {#if path.now}<circle cx={path.now.x} cy={path.now.y} r="7" fill="#ffb627" stroke="#fff" stroke-width="2" />{/if}
  {#each [[90, 'E'], [180, 'S'], [270, 'O']] as [az, label]}
    <text x={x(az as number)} y={H - 2} text-anchor="middle" font-size="11" fill="#4a3200">{label}</text>
  {/each}
</svg>

<style>
  svg { width: 100%; height: auto; display: block; }
</style>
