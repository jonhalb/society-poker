import { describe, expect, it } from 'vitest'
import {
  balance, buyInCount, cashedOutCents, lastBuyIn, lastPlayerPrefill, net, potCents,
  sortByNet, stillInPlayCents, topWinner, totalIn,
} from './game.ts'
import { makeGame } from './test-helpers.ts'

const live = makeGame({
  id: 'g1',
  date: '2026-06-05',
  status: 'active',
  rows: [
    ['mike', [20, 20], 55.5],
    ['jess', [20], null],
    ['dan', [20, 10], null],
  ],
})

describe('game maths', () => {
  it('adds up buy-ins and rebuys', () => {
    expect(totalIn(live.game_entries[0])).toBe(4000)
    expect(potCents(live)).toBe(9000)
    expect(buyInCount(live)).toBe(5)
  })

  it('treats players still in as $0 out', () => {
    expect(net(live.game_entries[0])).toBe(1550)
    expect(net(live.game_entries[1])).toBe(-2000)
  })

  it('tracks what is still in play', () => {
    expect(cashedOutCents(live)).toBe(5550)
    expect(stillInPlayCents(live)).toBe(3450)
  })

  it('goes negative when cash-outs exceed the pot', () => {
    const over = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 50], ['b', [20], null]] })
    expect(stillInPlayCents(over)).toBe(-1000)
  })

  it('reports the balance difference', () => {
    const short = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 15], ['b', [20], 20]] })
    expect(balance(short)).toEqual({ inCents: 4000, outCents: 3500, difference: -500 })
    const even = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 0], ['b', [20], 40]] })
    expect(balance(even).difference).toBe(0)
  })
})

describe('lastPlayerPrefill', () => {
  it('pre-fills what is left for the last player still in', () => {
    const g = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 30], ['b', [20], null]] })
    expect(lastPlayerPrefill(g, 'g-b')).toBe(1000)
  })
  it('does nothing while two or more are still playing', () => {
    expect(lastPlayerPrefill(live, 'g1-jess')).toBeNull()
  })
  it('does nothing for someone already cashed out', () => {
    const g = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 30], ['b', [20], null]] })
    expect(lastPlayerPrefill(g, 'g-a')).toBeNull()
  })
  it('does nothing when cash-outs already exceed the pot', () => {
    const g = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 50], ['b', [20], null]] })
    expect(lastPlayerPrefill(g, 'g-b')).toBeNull()
  })
})

describe('winners and order', () => {
  const g = makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 10], ['b', [20], 35], ['c', [20], 15]] })

  it('sorts biggest winner first', () => {
    expect(sortByNet(g.game_entries).map(e => e.player_id)).toEqual(['b', 'c', 'a'])
  })
  it('names the night’s winner', () => {
    expect(topWinner(g)?.player_id).toBe('b')
  })
  it('has no winner when nobody came out ahead', () => {
    expect(topWinner(makeGame({ id: 'g', date: '2026-06-05', rows: [['a', [20], 20]] }))).toBeNull()
  })
})

describe('lastBuyIn', () => {
  it('finds the most recent buy-in', () => {
    expect(lastBuyIn(live.game_entries[2])?.amount_cents).toBe(1000)
  })
})
