import { describe, expect, it } from 'vitest'
import { carryOverPaid, settleGame, settleUp, sortPayments, type PlayerNet } from './settle.ts'
import { makeGame } from './test-helpers.ts'
import type { Payment } from './types.ts'

const nets = (pairs: [string, number][]): PlayerNet[] =>
  pairs.map(([player_id, net_cents]) => ({ player_id, net_cents }))

const short = (t: { from_player_id: string, to_player_id: string, amount_cents: number }) =>
  `${t.from_player_id}→${t.to_player_id} ${t.amount_cents}`

describe('settleUp', () => {
  it('has the biggest loser pay the biggest winner first', () => {
    const result = settleUp(nets([['a', 3000], ['b', -1000], ['c', -2500], ['d', 500]]))
    expect(result.map(short)).toEqual(['c→a 2500', 'b→a 500', 'b→d 500'])
  })

  it('pays everyone exactly what they won when totals balance', () => {
    const input = nets([['a', 4850], ['b', -2000], ['c', 1150], ['d', -4000]])
    const result = settleUp(input)
    for (const p of input) {
      const received = result.filter(t => t.to_player_id === p.player_id).reduce((s, t) => s + t.amount_cents, 0)
      const paid = result.filter(t => t.from_player_id === p.player_id).reduce((s, t) => s + t.amount_cents, 0)
      expect(received - paid).toBe(p.net_cents)
    }
    expect(result.length).toBeLessThanOrEqual(input.length - 1)
  })

  it('keeps the given order when players tie', () => {
    const result = settleUp(nets([['a', 1000], ['b', 1000], ['c', -2000]]))
    expect(result.map(short)).toEqual(['c→a 1000', 'c→b 1000'])
  })

  it('needs no payments when everyone breaks even', () => {
    expect(settleUp(nets([['a', 0], ['b', 0]]))).toEqual([])
    expect(settleUp([])).toEqual([])
  })

  it('leaves the difference unassigned when cash-outs are short', () => {
    // Winner is owed $30 but losers only lost $25 in total
    const result = settleUp(nets([['a', 3000], ['b', -2500]]))
    expect(result.map(short)).toEqual(['b→a 2500'])
  })

  it('leaves the difference unassigned when cash-outs are over', () => {
    const result = settleUp(nets([['a', 1000], ['b', -2500]]))
    expect(result.map(short)).toEqual(['b→a 1000'])
  })

  it('works on a whole game', () => {
    const g = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20, 20], 0], ['b', [20], 60.5], ['c', [20], 19.5]] })
    expect(settleGame(g).map(short)).toEqual(['a→b 4000', 'c→b 50'])
  })
})

describe('carryOverPaid', () => {
  const payment = (from: string, to: string, amount: number, paid: boolean): Payment => ({
    id: `${from}${to}`, game_id: 'g', from_player_id: from, to_player_id: to,
    amount_cents: amount, paid, paid_at: paid ? '2026-06-06T10:00:00.000Z' : null,
  })

  it('keeps the paid tick on payments that did not change', () => {
    const fresh = settleUp(nets([['a', 3000], ['b', -1000], ['c', -2000]]))
    const result = carryOverPaid(fresh, [payment('c', 'a', 2000, true), payment('b', 'a', 1500, true)])
    expect(result.map(p => [short(p), p.paid])).toEqual([['c→a 2000', true], ['b→a 1000', false]])
    expect(result[0].paid_at).toBe('2026-06-06T10:00:00.000Z')
    expect(result[1].paid_at).toBeNull()
  })

  it('uses each old payment only once', () => {
    const fresh = [
      { from_player_id: 'a', to_player_id: 'b', amount_cents: 500 },
      { from_player_id: 'a', to_player_id: 'b', amount_cents: 500 },
    ]
    expect(carryOverPaid(fresh, [payment('a', 'b', 500, true)]).map(p => p.paid)).toEqual([true, false])
  })
})

describe('sortPayments', () => {
  it('puts the biggest payments first', () => {
    const list = [
      { from_player_id: 'a', to_player_id: 'x', amount_cents: 100 },
      { from_player_id: 'b', to_player_id: 'x', amount_cents: 900 },
      { from_player_id: 'a', to_player_id: 'y', amount_cents: 900 },
    ]
    expect(sortPayments(list).map(short)).toEqual(['a→y 900', 'b→x 900', 'a→x 100'])
  })
})
