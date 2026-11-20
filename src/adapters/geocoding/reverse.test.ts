import { describe, expect, it } from 'vitest'
import { pickPlaceName } from './reverse'

describe('pickPlaceName', () => {
  it('gives "hamlet, municipality" in the countryside', () => {
    expect(pickPlaceName({ address: { hamlet: 'Pievetta', village: "Santo Stefano d'Aveto", county: 'Genova' } })).toBe("Pievetta, Santo Stefano d'Aveto")
    expect(pickPlaceName({ address: { hamlet: 'Cascina Ponte', town: 'Bobbio' } })).toBe('Cascina Ponte, Bobbio')
  })
  it('gives the municipality alone in towns and cities', () => {
    expect(pickPlaceName({ address: { suburb: 'Municipio 1', city: 'Milano' } })).toBe('Milano')
    expect(pickPlaceName({ address: { town: 'Bobbio' } })).toBe('Bobbio')
  })
  it('does not repeat the name when hamlet and municipality are the same', () => {
    expect(pickPlaceName({ address: { hamlet: 'Rivergaro', village: 'Rivergaro' } })).toBe('Rivergaro')
  })
  it('falls back to broader areas and to null', () => {
    expect(pickPlaceName({ address: { county: 'Piacenza' } })).toBe('Piacenza')
    expect(pickPlaceName({ address: {} })).toBeNull()
    expect(pickPlaceName(null)).toBeNull()
    expect(pickPlaceName({})).toBeNull()
  })
})
