// Lifetime and group stats. Only completed games count.
import { formatMonth, monthKey } from './dates.ts'
import { net, potCents, totalIn, totalOut } from './game.ts'
import { sum } from './money.ts'
import type { EntryWithBuyIns, GameWithEntries, Id, Payment, Player } from './types.ts'

// Newest first. Two games on the same date: the one created later comes first.
function newestFirst(a: GameWithEntries, b: GameWithEntries): number {
  return b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
}

export function completedGames(games: GameWithEntries[]): GameWithEntries[] {
  return games.filter(g => g.status === 'completed').sort(newestFirst)
}

export function activeGame(games: GameWithEntries[]): GameWithEntries | null {
  return games.find(g => g.status === 'active') ?? null
}

// The game "Run it back" copies
export function mostRecentGame(games: GameWithEntries[]): GameWithEntries | null {
  return completedGames(games)[0] ?? null
}

export type Result = 'W' | 'L' | 'D'

export interface PlayerGame {
  game: GameWithEntries
  entry: EntryWithBuyIns
  net: number
  result: Result
}

export interface PlayerStats {
  history: PlayerGame[] // oldest first
  total: number
  played: number
  wins: number
  losses: number
  draws: number
  winRate: number // whole percent
  roi: number // whole percent: total ÷ invested
  average: number // cents per session
  best: number
  worst: number
  invested: number
  returned: number
  buyIns: number
  topFinishes: number // nights with the (joint) biggest win
  lastFive: PlayerGame[] // oldest first
}

const resultOf = (n: number): Result => n > 0 ? 'W' : n < 0 ? 'L' : 'D'

export function playerStats(playerId: Id, games: GameWithEntries[]): PlayerStats {
  const history: PlayerGame[] = []
  for (const game of completedGames(games).reverse()) {
    const entry = game.game_entries.find(e => e.player_id === playerId)
    if (entry) history.push({ game, entry, net: net(entry), result: resultOf(net(entry)) })
  }
  const nets = history.map(h => h.net)
  const played = history.length
  const total = sum(nets)
  const wins = nets.filter(n => n > 0).length
  const invested = sum(history.map(h => totalIn(h.entry)))
  return {
    history,
    total,
    played,
    wins,
    losses: nets.filter(n => n < 0).length,
    draws: nets.filter(n => n === 0).length,
    winRate: played ? Math.round(wins / played * 100) : 0,
    roi: invested ? Math.round(total / invested * 100) : 0,
    average: played ? Math.round(total / played) : 0,
    best: played ? Math.max(...nets) : 0,
    worst: played ? Math.min(...nets) : 0,
    invested,
    returned: sum(history.map(h => totalOut(h.entry))),
    buyIns: sum(history.map(h => h.entry.buy_ins.length)),
    topFinishes: history.filter(h => h.net > 0 && h.net === Math.max(...h.game.game_entries.map(net))).length,
    lastFive: history.slice(-5),
  }
}

export interface RankedPlayer {
  player: Player
  stats: PlayerStats
}

// Every player, biggest lifetime winner first (the Players tab)
export function rankPlayers(players: Player[], games: GameWithEntries[]): RankedPlayer[] {
  return players
    .map(player => ({ player, stats: playerStats(player.id, games) }))
    .sort((a, b) => b.stats.total - a.stats.total)
}

// Only players with at least one finished game (the Stats tab)
export function leaderboard(players: Player[], games: GameWithEntries[]): RankedPlayer[] {
  return rankPlayers(players, games).filter(r => r.stats.played > 0)
}

export interface GroupStats {
  throughPot: number
  gameCount: number
  playerCount: number
  biggestNight: { playerId: Id, net: number, game: GameWithEntries } | null
}

export function groupStats(players: Player[], games: GameWithEntries[]): GroupStats {
  const done = completedGames(games)
  let biggestNight: GroupStats['biggestNight'] = null
  for (const game of done) {
    for (const entry of game.game_entries) {
      if (!biggestNight || net(entry) > biggestNight.net) {
        biggestNight = { playerId: entry.player_id, net: net(entry), game }
      }
    }
  }
  return {
    throughPot: sum(done.map(potCents)),
    gameCount: done.length,
    playerCount: leaderboard(players, games).length,
    biggestNight,
  }
}

export interface MonthGroup {
  key: string // '2026-06'
  label: string // 'June 2026'
  games: GameWithEntries[] // newest first
  potCents: number
}

// Past games grouped by month, newest month first
export function monthGroups(games: GameWithEntries[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const game of completedGames(games)) {
    const key = monthKey(game.date)
    let group = groups.find(g => g.key === key)
    if (!group) {
      group = { key, label: formatMonth(key), games: [], potCents: 0 }
      groups.push(group)
    }
    group.games.push(game)
    group.potCents += potCents(game)
  }
  return groups
}

// Every unpaid payment from finished games, newest game first ("Still owed")
export function unpaidPayments(games: GameWithEntries[]): { game: GameWithEntries, payment: Payment }[] {
  return completedGames(games).flatMap(game =>
    game.payments.filter(p => !p.paid).map(payment => ({ game, payment })))
}

// The last few places played, for tap-to-fill chips
export function recentLocations(games: GameWithEntries[], limit = 5): string[] {
  const seen: string[] = []
  for (const game of [...games].sort(newestFirst)) {
    const place = game.location.trim()
    if (place && !seen.includes(place)) seen.push(place)
  }
  return seen.slice(0, limit)
}
