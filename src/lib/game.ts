// Maths for a single game: pot, nets, what's still in play.
import { sum } from './money.ts'
import type { BuyIn, EntryWithBuyIns, GameWithEntries } from './types.ts'

export function totalIn(entry: EntryWithBuyIns): number {
  return sum(entry.buy_ins.map(b => b.amount_cents))
}

// Someone still playing counts as $0 out
export function totalOut(entry: EntryWithBuyIns): number {
  return entry.cash_out_cents ?? 0
}

export function net(entry: EntryWithBuyIns): number {
  return totalOut(entry) - totalIn(entry)
}

export function isPlaying(entry: EntryWithBuyIns): boolean {
  return entry.cash_out_cents === null
}

// Everything bought in, including rebuys
export function potCents(game: GameWithEntries): number {
  return sum(game.game_entries.map(totalIn))
}

export function cashedOutCents(game: GameWithEntries): number {
  return sum(game.game_entries.map(totalOut))
}

// Pot minus what's already been cashed out. Negative means someone's
// cash-out was entered too high.
export function stillInPlayCents(game: GameWithEntries): number {
  return potCents(game) - cashedOutCents(game)
}

export function buyInCount(game: GameWithEntries): number {
  return sum(game.game_entries.map(e => e.buy_ins.length))
}

// Balance check: `difference` is 0 when cash-outs match buy-ins,
// negative when cash-outs are short, positive when they're over
export function balance(game: GameWithEntries): { inCents: number, outCents: number, difference: number } {
  const inCents = potCents(game)
  const outCents = cashedOutCents(game)
  return { inCents, outCents, difference: outCents - inCents }
}

// When the last player still in cashes out, pre-fill what's left in play.
// Returns null when there's nothing sensible to pre-fill.
export function lastPlayerPrefill(game: GameWithEntries, entryId: string): number | null {
  const playing = game.game_entries.filter(isPlaying)
  if (playing.length !== 1 || playing[0].id !== entryId) return null
  const left = stillInPlayCents(game)
  return left >= 0 ? left : null
}

// Biggest winner first. Ties keep their original order.
export function sortByNet(entries: EntryWithBuyIns[]): EntryWithBuyIns[] {
  return [...entries].sort((a, b) => net(b) - net(a))
}

// The night's winner, or null if nobody came out ahead
export function topWinner(game: GameWithEntries): EntryWithBuyIns | null {
  const top = sortByNet(game.game_entries)[0]
  return top && net(top) > 0 ? top : null
}

// The most recent buy-in, for "Remove last buy-in"
export function lastBuyIn(entry: EntryWithBuyIns): BuyIn | null {
  let last: BuyIn | null = null
  for (const b of entry.buy_ins) if (!last || b.created_at >= last.created_at) last = b
  return last
}
