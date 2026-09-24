// Builders for tests: short, readable games instead of pages of raw rows.
import type { GameStatus, GameWithEntries, Payment, Player } from './types.ts'

export function makePlayer(id: string, order = 0, extra: Partial<Player> = {}): Player {
  return {
    id,
    group_id: 'group',
    name: id[0].toUpperCase() + id.slice(1),
    emoji: '🃏',
    photo_path: null,
    user_id: null,
    archived: false,
    created_at: `2026-01-01T00:00:${String(order).padStart(2, '0')}.000Z`,
    ...extra,
  }
}

// One row per player: [player id, buy-ins in dollars, cash-out in dollars or null]
export type Row = [string, number[], number | null]

export function makeGame(opts: {
  id: string
  date: string
  rows: Row[]
  status?: GameStatus
  location?: string
  notes?: string
  payments?: Partial<Payment>[]
  created_at?: string
}): GameWithEntries {
  const created = opts.created_at ?? `${opts.date}T20:00:00.000Z`
  return {
    id: opts.id,
    group_id: 'group',
    date: opts.date,
    location: opts.location ?? '',
    stakes: '0.25/0.50',
    default_buy_in_cents: 2000,
    status: opts.status ?? 'completed',
    started_at: created,
    duration_minutes: null,
    notes: opts.notes ?? '',
    created_by: null,
    created_at: created,
    updated_at: created,
    game_entries: opts.rows.map(([pid, buys, out]) => {
      const entryId = `${opts.id}-${pid}`
      return {
        id: entryId,
        game_id: opts.id,
        player_id: pid,
        cash_out_cents: out === null ? null : Math.round(out * 100),
        buy_ins: buys.map((dollars, i) => ({
          id: `${entryId}-b${i}`,
          entry_id: entryId,
          amount_cents: Math.round(dollars * 100),
          created_at: `${opts.date}T20:${String(i).padStart(2, '0')}:00.000Z`,
        })),
      }
    }),
    payments: (opts.payments ?? []).map((p, i) => ({
      id: `${opts.id}-p${i}`,
      game_id: opts.id,
      from_player_id: '',
      to_player_id: '',
      amount_cents: 0,
      paid: false,
      paid_at: null,
      ...p,
    })),
  }
}
