import { describe, expect, it } from 'vitest'
import {
  activeGame, completedGames, groupStats, leaderboard, monthGroups, mostRecentGame,
  playerStats, rankPlayers, recentLocations, unpaidPayments,
} from './stats.ts'
import { makeGame, makePlayer } from './test-helpers.ts'

const players = ['mike', 'jess', 'dan', 'tom'].map((id, i) => makePlayer(id, i))

// Three finished nights and one live one
const games = [
  makeGame({
    id: 'jun5', date: '2026-06-05', location: "Tom's garage",
    rows: [['mike', [20], 50], ['jess', [20, 20], 10], ['dan', [20], 20]],
    payments: [{ from_player_id: 'jess', to_player_id: 'mike', amount_cents: 3000, paid: true }],
  }),
  makeGame({
    id: 'jun12', date: '2026-06-12', location: "Mike's kitchen",
    rows: [['mike', [20], 0], ['jess', [20], 30], ['dan', [20], 30]],
    payments: [
      { from_player_id: 'mike', to_player_id: 'jess', amount_cents: 1000, paid: false },
      { from_player_id: 'mike', to_player_id: 'dan', amount_cents: 1000, paid: true },
    ],
  }),
  makeGame({
    id: 'jul3', date: '2026-07-03', location: "Tom's garage",
    rows: [['mike', [20, 10], 45], ['jess', [20], 5]],
    payments: [{ from_player_id: 'jess', to_player_id: 'mike', amount_cents: 1500, paid: false }],
  }),
  makeGame({
    id: 'live', date: '2026-07-10', status: 'active', location: "Dan's apartment",
    rows: [['mike', [20], null], ['tom', [20], null]],
  }),
]

describe('game lists', () => {
  it('lists finished games newest first and ignores the live one', () => {
    expect(completedGames(games).map(g => g.id)).toEqual(['jul3', 'jun12', 'jun5'])
    expect(mostRecentGame(games)?.id).toBe('jul3')
    expect(activeGame(games)?.id).toBe('live')
  })

  it('breaks same-day ties by which game was created later', () => {
    const early = makeGame({ id: 'early', date: '2026-08-01', rows: [], created_at: '2026-08-01T18:00:00.000Z' })
    const late = makeGame({ id: 'late', date: '2026-08-01', rows: [], created_at: '2026-08-01T23:00:00.000Z' })
    expect(completedGames([early, late]).map(g => g.id)).toEqual(['late', 'early'])
  })

  it('groups past games by month with totals', () => {
    expect(monthGroups(games).map(m => [m.label, m.games.map(g => g.id), m.potCents])).toEqual([
      ['July 2026', ['jul3'], 5000],
      ['June 2026', ['jun12', 'jun5'], 6000 + 8000],
    ])
  })

  it('lists unpaid payments newest game first', () => {
    expect(unpaidPayments(games).map(u => `${u.game.id} ${u.payment.from_player_id}→${u.payment.to_player_id}`))
      .toEqual(['jul3 jess→mike', 'jun12 mike→jess'])
  })

  it('suggests recent places without repeats, including the live game', () => {
    expect(recentLocations(games)).toEqual(["Dan's apartment", "Tom's garage", "Mike's kitchen"])
    expect(recentLocations(games, 2)).toHaveLength(2)
  })
})

describe('playerStats', () => {
  const mike = playerStats('mike', games)

  it('adds up lifetime results from finished games only', () => {
    // +30, −20, +15
    expect(mike.total).toBe(2500)
    expect(mike.played).toBe(3)
    expect([mike.wins, mike.losses, mike.draws]).toEqual([2, 1, 0])
    expect(mike.best).toBe(3000)
    expect(mike.worst).toBe(-2000)
  })

  it('works out rates and averages', () => {
    expect(mike.winRate).toBe(67)
    expect(mike.invested).toBe(7000)
    expect(mike.returned).toBe(9500)
    expect(mike.roi).toBe(36)
    expect(mike.average).toBe(833)
    expect(mike.buyIns).toBe(4)
  })

  it('keeps history oldest first', () => {
    expect(mike.history.map(h => h.result)).toEqual(['W', 'L', 'W'])
    expect(mike.lastFive.map(h => h.game.id)).toEqual(['jun5', 'jun12', 'jul3'])
  })

  it('counts draws and shared top finishes', () => {
    const dan = playerStats('dan', games)
    expect(dan.history.map(h => h.result)).toEqual(['D', 'W'])
    // Dan and Jess tied for the biggest win on Jun 12: both count it
    expect(dan.topFinishes).toBe(1)
    expect(playerStats('jess', games).topFinishes).toBe(1)
    expect(mike.topFinishes).toBe(2)
  })

  it('counts a draw as played but not won in the win rate', () => {
    // Dan: one break-even night, one win → 1 ÷ 2 = 50%
    expect(playerStats('dan', games).winRate).toBe(50)
  })

  it('gives nobody a top finish on a night everyone broke even', () => {
    const flat = [makeGame({ id: 'flat', date: '2026-08-01', rows: [['mike', [20], 20], ['jess', [20], 20]] })]
    expect(playerStats('mike', flat).topFinishes).toBe(0)
    expect(playerStats('jess', flat).topFinishes).toBe(0)
  })

  it('only keeps the last five games', () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      makeGame({ id: `g${i}`, date: `2026-08-0${i + 1}`, rows: [['mike', [20], i < 2 ? 0 : 40]] }))
    expect(playerStats('mike', many).lastFive.map(h => h.game.id)).toEqual(['g2', 'g3', 'g4', 'g5', 'g6'])
  })

  it('returns zeros for someone who never finished a game', () => {
    const tom = playerStats('tom', games)
    expect([tom.played, tom.total, tom.winRate, tom.roi, tom.average, tom.best, tom.worst]).toEqual([0, 0, 0, 0, 0, 0, 0])
  })
})

describe('rankings and group stats', () => {
  it('ranks every player on the Players tab, biggest winner first', () => {
    expect(rankPlayers(players, games).map(r => r.player.id)).toEqual(['mike', 'dan', 'tom', 'jess'])
  })

  it('leaves players with no finished games off the leaderboard', () => {
    expect(leaderboard(players, games).map(r => r.player.id)).toEqual(['mike', 'dan', 'jess'])
  })

  it('sums the group totals', () => {
    const s = groupStats(players, games)
    expect(s.throughPot).toBe(19000)
    expect(s.gameCount).toBe(3)
    expect(s.playerCount).toBe(3)
    expect(s.biggestNight).toMatchObject({ playerId: 'mike', net: 3000 })
    expect(s.biggestNight?.game.id).toBe('jun5')
  })

  it('has no biggest night before any game is finished', () => {
    expect(groupStats(players, []).biggestNight).toBeNull()
  })
})
