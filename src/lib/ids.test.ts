import { describe, expect, it } from 'vitest'
import { newId } from './ids.ts'

describe('newId', () => {
  it('makes UUID v4 strings like Supabase uses', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId))
    expect(ids.size).toBe(1000)
  })
})
