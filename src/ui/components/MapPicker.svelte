<script lang="ts">
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { onMount } from 'svelte'

  export interface Point {
    lat: number
    lon: number
  }
  let { point, onpick }: { point: Point | null; onpick: (p: Point) => void } = $props()

  let el: HTMLDivElement
  let map: L.Map
  let marker: L.Marker | null = null

  const pin = L.divIcon({ className: 'pin', html: '📍', iconSize: [32, 32], iconAnchor: [16, 30] })

  function place(p: Point, zoom?: number) {
    if (!marker) {
      marker = L.marker([p.lat, p.lon], { icon: pin, draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const ll = marker!.getLatLng()
        onpick({ lat: ll.lat, lon: ll.lng })
      })
    } else {
      marker.setLatLng([p.lat, p.lon])
    }
    map.setView([p.lat, p.lon], zoom ?? Math.max(map.getZoom(), 15))
  }

  onMount(() => {
    map = L.map(el, { zoomControl: true }).setView(point ? [point.lat, point.lon] : [42.5, 12.5], point ? 15 : 5)
    const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    })
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri',
    })
    streets.addTo(map)
    L.control.layers({ Mappa: streets, Satellite: sat }, {}, { position: 'topright' }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      const p = { lat: e.latlng.lat, lon: e.latlng.lng }
      place(p)
      onpick(p)
    })
    if (point) place(point, 15)
    return () => map.remove()
  })

  // Follow selections made outside the map (GPS, search, pasted coordinates)
  $effect(() => {
    if (!map || !point) return
    const cur = marker?.getLatLng()
    if (!cur || Math.abs(cur.lat - point.lat) > 1e-6 || Math.abs(cur.lng - point.lon) > 1e-6) place(point)
  })
</script>

<div bind:this={el} class="map"></div>

<style>
  .map { height: 300px; border-radius: 20px; overflow: hidden; border: 2px solid var(--pesca); z-index: 0; }
  :global(.pin) { font-size: 28px; line-height: 32px; text-align: center; background: none; border: 0; }
</style>
