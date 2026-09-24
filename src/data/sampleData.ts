// The prototype's 15 sample games (8 players, June to September 2026).
//
// DEVELOPMENT ONLY. This file is loaded only by the "Load test data" button,
// and that button exists only in development mode (`npm run dev`). The real
// built app doesn't contain this file at all.
import { newId } from '../lib/ids.ts'
import { settleUp } from '../lib/settle.ts'
import type { BuyIn, Game, GameEntry, Payment, Player } from '../lib/types.ts'
import { LOCAL_GROUP_ID, type Tables } from './store.ts'

const PLAYERS: [string, string][] = [
  ["Mike", "🎰"],
  ["Jess", "🦈"],
  ["Dan", "🎲"],
  ["Priya", "👑"],
  ["Tom", "🃏"],
  ["Alex", "🚀"],
  ["Marcus", "🐺"],
  ["Sofia", "🦊"],
]

// [date, location, [[player, buy-ins in dollars, cash-out in dollars]], duration, note]
const GAMES: [string, string, [string, number[], number][], string, string][] = [
  ["2026-06-05", "Tom's garage", [
    ["Priya", [20,20,20], 58.5],
    ["Alex", [20], 0],
    ["Mike", [20], 69.5],
    ["Tom", [20,20], 67],
    ["Dan", [20,20,20], 5],
  ], "2h 42m", ""],
  ["2026-06-12", "Mike's kitchen", [
    ["Marcus", [20], 4.5],
    ["Jess", [20], 34.5],
    ["Dan", [20], 16.5],
    ["Priya", [20,20], 45.5],
    ["Mike", [20], 48],
    ["Tom", [20,20], 11],
  ], "3h 32m", ""],
  ["2026-06-20", "Mike's kitchen", [
    ["Tom", [20], 62],
    ["Priya", [20,20,20], 0],
    ["Dan", [20], 27.5],
    ["Alex", [20,20], 48.5],
    ["Jess", [20,10], 32],
  ], "4h 26m", "Dan's birthday game. Played until 3am."],
  ["2026-06-26", "Dan's apartment", [
    ["Priya", [20], 89],
    ["Alex", [20], 3.5],
    ["Mike", [20], 0],
    ["Tom", [20], 10.5],
    ["Dan", [20,20], 17],
  ], "4h 10m", ""],
  ["2026-07-03", "Priya's patio", [
    ["Priya", [20], 20],
    ["Marcus", [20], 11],
    ["Tom", [20,20], 16],
    ["Dan", [20], 83],
    ["Mike", [20,10], 0],
  ], "4h 17m", ""],
  ["2026-07-10", "Priya's patio", [
    ["Tom", [20], 0],
    ["Dan", [20], 0],
    ["Jess", [20], 47.5],
    ["Mike", [20], 67.5],
    ["Marcus", [20,20], 4.5],
    ["Alex", [20], 20.5],
  ], "3h 58m", ""],
  ["2026-07-17", "Jess's place", [
    ["Jess", [20,10], 24.5],
    ["Mike", [20,20], 38],
    ["Priya", [20], 31.5],
    ["Alex", [20], 23.5],
    ["Tom", [20], 0],
    ["Sofia", [20], 32.5],
  ], "3h 12m", "First game with Sofia."],
  ["2026-07-24", "Jess's place", [
    ["Alex", [20], 1],
    ["Sofia", [20], 14.5],
    ["Jess", [20,20], 65.5],
    ["Tom", [20], 46.5],
    ["Marcus", [20,10], 50],
    ["Mike", [20,20,20], 12.5],
  ], "3h 20m", ""],
  ["2026-07-31", "Tom's garage", [
    ["Mike", [20,20], 0],
    ["Priya", [20], 86],
    ["Alex", [20], 28.5],
    ["Dan", [20,20], 4.5],
    ["Sofia", [20], 0],
    ["Tom", [20], 41],
  ], "5h 17m", ""],
  ["2026-08-08", "Marcus's basement", [
    ["Sofia", [20,20,20], 42.5],
    ["Alex", [20], 8.5],
    ["Dan", [20], 9.5],
    ["Jess", [20], 35],
    ["Tom", [20], 18.5],
    ["Mike", [20], 46],
  ], "4h 27m", "Power went out for 20 minutes, played by flashlight."],
  ["2026-08-15", "Priya's patio", [
    ["Marcus", [20], 14],
    ["Sofia", [20], 0],
    ["Tom", [20], 64],
    ["Jess", [20], 62],
    ["Alex", [20], 0],
    ["Dan", [20,20], 0],
  ], "2h 55m", ""],
  ["2026-08-21", "Tom's garage", [
    ["Mike", [20], 23],
    ["Marcus", [20], 16.5],
    ["Sofia", [20,20], 40.5],
    ["Priya", [20,20], 46.5],
    ["Dan", [20], 13],
    ["Tom", [20], 15.5],
  ], "5h 21m", "Chip count came up $5 short. Nobody could find it."],
  ["2026-08-28", "Tom's garage", [
    ["Priya", [20], 8],
    ["Alex", [20,20], 37],
    ["Dan", [20], 30.5],
    ["Mike", [20], 24.5],
  ], "3h 27m", ""],
  ["2026-09-05", "Marcus's basement", [
    ["Marcus", [20,20,20], 44],
    ["Dan", [20,10], 0],
    ["Priya", [20,10], 97.5],
    ["Jess", [20], 0],
    ["Sofia", [20], 24],
    ["Tom", [20], 14.5],
  ], "4h 18m", "Jess won three all-ins in a row."],
  ["2026-09-11", "Priya's patio", [
    ["Dan", [20,10], 0],
    ["Tom", [20,20], 17.5],
    ["Marcus", [20], 16],
    ["Alex", [20,20], 0],
    ["Priya", [20], 88],
    ["Sofia", [20,20], 68.5],
  ], "2h 41m", ""],
]

// '2h 42m' -> 162
function minutes(duration: string): number {
  const m = duration.match(/(?:(\d+)h\s*)?(\d+)m/)
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : 0
}

export function sampleTables(): Tables {
  const players: Player[] = PLAYERS.map(([name, emoji], i) => ({
    id: newId(), group_id: LOCAL_GROUP_ID, name, emoji, photo_path: null, user_id: null,
    archived: false, created_at: `2026-06-01T12:00:0${i}.000Z`,
  }))
  const idOf = (name: string) => players.find(p => p.name === name)!.id
  const t: Tables = { players, games: [], game_entries: [], buy_ins: [], payments: [] }

  GAMES.forEach(([date, location, rows, duration, notes], gi) => {
    const at = `${date}T19:00:00.000Z`
    const game: Game = {
      id: newId(), group_id: LOCAL_GROUP_ID, date, location, stakes: '0.25/0.50',
      default_buy_in_cents: 2000, status: 'completed', started_at: at,
      duration_minutes: minutes(duration), notes, created_by: null, created_at: at, updated_at: at,
    }
    t.games.push(game)
    const nets = rows.map(([name, buys, out]) => {
      const entry: GameEntry = {
        id: newId(), game_id: game.id, player_id: idOf(name), cash_out_cents: Math.round(out * 100), created_at: at,
      }
      t.game_entries.push(entry)
      buys.forEach((dollars, bi) => {
        const buyIn: BuyIn = {
          id: newId(), entry_id: entry.id, amount_cents: Math.round(dollars * 100),
          created_at: `${date}T19:${String(bi * 20).padStart(2, '0')}:00.000Z`,
        }
        t.buy_ins.push(buyIn)
      })
      return { player_id: entry.player_id, net_cents: entry.cash_out_cents! - Math.round(buys.reduce((a, b) => a + b, 0) * 100) }
    })
    // Like the prototype: everything is paid except the first two payments
    // of the two most recent games, so "Still owed" has something to show
    settleUp(nets).forEach((transfer, i) => {
      const paid = !(gi >= GAMES.length - 2 && i < 2)
      const payment: Payment = {
        ...transfer, id: newId(), game_id: game.id, paid, paid_at: paid ? `${date}T23:30:00.000Z` : null,
      }
      t.payments.push(payment)
    })
  })
  return t
}
