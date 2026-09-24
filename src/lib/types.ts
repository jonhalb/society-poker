// Data shapes, matching the Supabase tables planned in CLAUDE.md.
//
// Field names are snake_case on purpose: that is how Supabase returns rows,
// so in Phase 4 these can come straight from the database without renaming.
//
// - Money is always whole cents (2050 means $20.50), never decimals.
// - A game's `date` is a plain 'YYYY-MM-DD' string so it never shifts by time zone.
// - Timestamps are ISO strings, e.g. '2026-06-05T19:30:00.000Z'.

export type Id = string

export interface Player {
  id: Id
  group_id: Id
  name: string
  emoji: string
  photo_path: string | null
  user_id: Id | null // set when someone claims this player with their login
  archived: boolean // players are archived, never deleted
  created_at: string
}

export type GameStatus = 'active' | 'completed'

export interface Game {
  id: Id
  group_id: Id
  date: string
  location: string
  stakes: string
  default_buy_in_cents: number
  status: GameStatus
  started_at: string | null // null for games logged after the fact
  duration_minutes: number | null
  notes: string
  created_by: Id | null
  created_at: string
  updated_at: string
}

// One player's seat in one game
export interface GameEntry {
  id: Id
  game_id: Id
  player_id: Id
  cash_out_cents: number | null // null while still playing
}

// Every buy-in and rebuy is its own record
export interface BuyIn {
  id: Id
  entry_id: Id
  amount_cents: number
  created_at: string
}

export interface Payment {
  id: Id
  game_id: Id
  from_player_id: Id
  to_player_id: Id
  amount_cents: number
  paid: boolean
  paid_at: string | null
}

// A game with its entries, buy-ins and payments attached. This is the same
// nested shape Supabase returns for
// `select('*, game_entries(*, buy_ins(*)), payments(*)')`.
export interface EntryWithBuyIns extends GameEntry {
  buy_ins: BuyIn[]
}

export interface GameWithEntries extends Game {
  game_entries: EntryWithBuyIns[]
  payments: Payment[]
}
