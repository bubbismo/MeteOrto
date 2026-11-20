import { describe, expect, it } from 'vitest'
import { buildForecastUrl, parseForecast } from './forecast'

describe('openmeteo forecast adapter', () => {
  it('builds a multi-model URL', () => {
    const url = new URL(buildForecastUrl({ lat: 44.6863, lon: 9.8568, elevation: null }))
    expect(url.searchParams.get('latitude')).toBe('44.6863')
    expect(url.searchParams.get('models')).toContain('icon_d2')
    expect(url.searchParams.get('models')).toContain('italia_meteo_arpae_icon_2i')
    expect(url.searchParams.get('timezone')).toBe('auto')
  })

  it('parses per-model columns and drops empty models', () => {
    const json = {
      utc_offset_seconds: 3600,
      hourly: {
        time: ['2026-03-10T00:00', '2026-03-10T01:00'],
        temperature_2m_icon_eu: [5, 6],
        precipitation_icon_eu: [0, 0.4],
        weather_code_icon_eu: [1, 61],
        temperature_2m_icon_d2: [null, null],
      },
    }
    const raw = parseForecast(json, 123)
    expect(raw.models.map((m) => m.model)).toEqual(['icon_eu'])
    expect(raw.utcOffsetSeconds).toBe(3600)
    expect(raw.models[0].values.temperature).toEqual([5, 6])
    expect(raw.models[0].values.precipitation).toEqual([0, 0.4])
    expect(raw.models[0].values.et0).toEqual([null, null])
    expect(raw.models[0].weatherCode).toEqual([1, 61])
  })
})
