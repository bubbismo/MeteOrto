import { describe, expect, it } from 'vitest'
import { parseLocation } from './parse'

describe('parseLocation', () => {
  it('parses Google Maps copied coordinates', () => {
    expect(parseLocation('44.68630, 9.85680')).toEqual({ ok: true, lat: 44.6863, lon: 9.8568 })
  })
  it('parses negative and space-separated values', () => {
    expect(parseLocation(' -33.86 151.21 ')).toEqual({ ok: true, lat: -33.86, lon: 151.21 })
  })
  it('prefers the exact pin over the map centre', () => {
    const url = 'https://www.google.com/maps/place/Casa/@44.70,9.90,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d44.6863!4d9.8568'
    expect(parseLocation(url)).toEqual({ ok: true, lat: 44.6863, lon: 9.8568 })
  })
  it('parses @lat,lon links', () => {
    expect(parseLocation('https://www.google.com/maps/@44.6863,9.8568,15z')).toEqual({ ok: true, lat: 44.6863, lon: 9.8568 })
  })
  it('parses ?q= links, also URL-encoded', () => {
    expect(parseLocation('https://maps.google.com/?q=44.6863%2C9.8568')).toEqual({ ok: true, lat: 44.6863, lon: 9.8568 })
    expect(parseLocation('https://maps.google.com/?q=44.6863,9.8568')).toEqual({ ok: true, lat: 44.6863, lon: 9.8568 })
  })
  it('parses /place/lat,lon links', () => {
    expect(parseLocation('https://www.google.com/maps/place/44.6863,9.8568')).toEqual({ ok: true, lat: 44.6863, lon: 9.8568 })
  })
  it('flags short links', () => {
    expect(parseLocation('https://maps.app.goo.gl/abc123')).toEqual({ ok: false, reason: 'short-link' })
  })
  it('rejects empty, garbage and out-of-range input', () => {
    expect(parseLocation('  ')).toEqual({ ok: false, reason: 'empty' })
    expect(parseLocation('ciao')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseLocation('144.5, 9.8')).toEqual({ ok: false, reason: 'out-of-range' })
  })
})
