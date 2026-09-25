import { describe, expect, it } from 'vitest'
import { summarizeLog } from './logForm.ts'

describe('summarizeLog', () => {
  it('adds up a balanced game', () => {
    const s = summarizeLog([{ in: '40', out: '65.50' }, { in: '40', out: '14.50' }])
    expect(s).toMatchObject({ missing: 0, inCents: 8000, outCents: 8000, difference: 0 })
    expect(s.rows).toEqual([{ inCents: 4000, outCents: 6550 }, { inCents: 4000, outCents: 1450 }])
  })

  it('reports cash-outs short of or over the buy-ins', () => {
    expect(summarizeLog([{ in: '20', out: '15' }, { in: '20', out: '20' }]).difference).toBe(-500)
    expect(summarizeLog([{ in: '20', out: '30' }, { in: '20', out: '20' }]).difference).toBe(1000)
  })

  it('accepts $0 in or out', () => {
    expect(summarizeLog([{ in: '20', out: '0' }, { in: '0', out: '20' }]).missing).toBe(0)
  })

  it('counts players with blank or invalid amounts', () => {
    const s = summarizeLog([{ in: '20', out: '' }, { in: '-5', out: '10' }, { in: '20', out: '20' }])
    expect(s.missing).toBe(2)
    expect(s.rows).toBeNull()
  })

  it('handles no players', () => {
    expect(summarizeLog([])).toMatchObject({ missing: 0, rows: [], difference: 0 })
  })
})
