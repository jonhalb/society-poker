// Settle-up: who pays whom at the end of a night.
import { net } from './game.ts'
import type { GameWithEntries, Id, Payment } from './types.ts'

export interface Transfer {
  from_player_id: Id
  to_player_id: Id
  amount_cents: number
}

export interface PlayerNet {
  player_id: Id
  net_cents: number
}

// Greedy method: the biggest loser pays the biggest winner as much as they
// can, then we move on to the next biggest. Players who tie keep the order
// they were given in.
//
// If cash-outs don't match buy-ins, some money is left unassigned on
// purpose (CLAUDE.md: "mismatched totals are left as-is for now").
export function settleUp(nets: PlayerNet[]): Transfer[] {
  const winners = nets.filter(p => p.net_cents > 0)
    .map(p => ({ id: p.player_id, left: p.net_cents }))
    .sort((a, b) => b.left - a.left)
  const losers = nets.filter(p => p.net_cents < 0)
    .map(p => ({ id: p.player_id, left: -p.net_cents }))
    .sort((a, b) => b.left - a.left)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < losers.length && j < winners.length) {
    const amount = Math.min(losers[i].left, winners[j].left)
    transfers.push({ from_player_id: losers[i].id, to_player_id: winners[j].id, amount_cents: amount })
    losers[i].left -= amount
    winners[j].left -= amount
    if (losers[i].left === 0) i++
    if (winners[j].left === 0) j++
  }
  return transfers
}

export function settleGame(game: GameWithEntries): Transfer[] {
  return settleUp(game.game_entries.map(e => ({ player_id: e.player_id, net_cents: net(e) })))
}

// When settle-up is recalculated (say, after fixing a cash-out), keep the
// "paid" tick on any payment that's still exactly the same.
export function carryOverPaid(
  fresh: Transfer[],
  existing: Payment[],
): (Transfer & { paid: boolean, paid_at: string | null })[] {
  const used = new Set<Payment>()
  return fresh.map(t => {
    const old = existing.find(p => !used.has(p)
      && p.from_player_id === t.from_player_id
      && p.to_player_id === t.to_player_id
      && p.amount_cents === t.amount_cents)
    if (old) used.add(old)
    return { ...t, paid: old?.paid ?? false, paid_at: old?.paid_at ?? null }
  })
}

// Biggest payments first, so the list doesn't reshuffle between loads
export function sortPayments<T extends Transfer>(payments: T[]): T[] {
  return [...payments].sort((a, b) => b.amount_cents - a.amount_cents
    || a.from_player_id.localeCompare(b.from_player_id)
    || a.to_player_id.localeCompare(b.to_player_id))
}
