// The ONE place the app reads and saves data.
//
// Screens never touch storage directly. They read with useAppData() and
// change things only through the functions on `store` below. In Phase 4 the
// insides of this file switch from phone storage to Supabase, and the
// screens don't need to change:
//
// - Data is kept as the same tables the database will have (players, games,
//   game_entries, buy_ins, payments), with the same column names.
// - Every change is async (returns a Promise) and throws a DataError when
//   it's refused, just like a database call would.
// - Rules the database will enforce (one live game per group, no negative
//   amounts, no duplicate player names) are checked here too.
import { useSyncExternalStore } from 'react'
import { minutesSince } from '../lib/dates.ts'
import { newId } from '../lib/ids.ts'
import { cleanName, findByName, pickEmoji } from '../lib/players.ts'
import { carryOverPaid, settleGame, settleUp, unmatchedPaid } from '../lib/settle.ts'
import type { BuyIn, Game, GameEntry, GameWithEntries, Id, Payment, Player } from '../lib/types.ts'

export interface Tables {
  players: Player[]
  games: Game[]
  game_entries: GameEntry[]
  buy_ins: BuyIn[]
  payments: Payment[]
}

// What screens read: players in the order they were added, and each game
// with its entries, buy-ins and payments attached
export interface AppData {
  players: Player[]
  games: GameWithEntries[]
}

// Everything belonging to one game, saved before a change so Undo can put it back
export interface GameSnapshot {
  game: Game
  entries: GameEntry[]
  buy_ins: BuyIn[]
  payments: Payment[]
}

export type DataErrorCode =
  | 'duplicate-name' | 'game-active' | 'still-playing' | 'too-few-players'
  | 'invalid-amount' | 'invalid-name' | 'not-found' | 'save-failed'

export class DataError extends Error {
  code: DataErrorCode
  constructor(code: DataErrorCode, message: string) {
    super(message)
    this.name = 'DataError'
    this.code = code
  }
}

// The minimum we need from localStorage, so tests can pass in a fake
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const STORAGE_KEY = 'society-poker:v1'
// Until accounts exist (Phase 3) everything belongs to one local group
export const LOCAL_GROUP_ID = '00000000-0000-4000-8000-000000000000'

export const emptyTables = (): Tables => ({ players: [], games: [], game_entries: [], buy_ins: [], payments: [] })

// Money must be a whole, non-negative number of cents (the database will
// have the same rule)
function checkAmount(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new DataError('invalid-amount', 'Amounts must be $0 or more.')
  }
}

// Join the flat tables into games with their entries, buy-ins and payments
export function joinTables(t: Tables): AppData {
  const buyInsByEntry = new Map<Id, BuyIn[]>()
  for (const b of t.buy_ins) buyInsByEntry.set(b.entry_id, [...(buyInsByEntry.get(b.entry_id) ?? []), b])
  const byCreated = <T extends { created_at: string }>(a: T, b: T) => a.created_at.localeCompare(b.created_at)
  return {
    players: [...t.players].sort(byCreated),
    games: t.games.map(game => ({
      ...game,
      game_entries: t.game_entries
        .filter(e => e.game_id === game.id)
        .sort(byCreated)
        .map(e => ({ ...e, buy_ins: [...(buyInsByEntry.get(e.id) ?? [])].sort(byCreated) })),
      payments: t.payments.filter(p => p.game_id === game.id),
    })),
  }
}

function readTables(storage: StorageLike): Tables {
  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyTables()
    const parsed = JSON.parse(raw) as { version: number, tables: Tables }
    if (parsed.version !== 1) throw new Error('Unknown version')
    return { ...emptyTables(), ...parsed.tables }
  } catch {
    // Unreadable data: keep a copy aside rather than overwriting it later
    try { if (raw) storage.setItem(STORAGE_KEY + ':unreadable', raw) } catch { /* nothing more we can do */ }
    return emptyTables()
  }
}

export function createStore(storage: StorageLike, now: () => Date = () => new Date()) {
  let tables = readTables(storage)
  let snapshot = joinTables(tables)
  const listeners = new Set<() => void>()

  const stamp = () => now().toISOString()

  // Save a new version of the tables. If saving fails (phone storage full),
  // nothing changes and the caller gets an error to show.
  function commit(next: Tables) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tables: next }))
    } catch {
      throw new DataError('save-failed', "Couldn't save on this phone. Storage may be full.")
    }
    tables = next
    snapshot = joinTables(tables)
    listeners.forEach(l => l())
  }

  function getGame(id: Id): Game {
    const game = tables.games.find(g => g.id === id)
    if (!game) throw new DataError('not-found', 'That game no longer exists.')
    return game
  }

  function getEntry(id: Id): GameEntry {
    const entry = tables.game_entries.find(e => e.id === id)
    if (!entry) throw new DataError('not-found', 'That player is no longer in the game.')
    return entry
  }

  function checkNoOtherActive(exceptGameId?: Id) {
    if (tables.games.some(g => g.status === 'active' && g.id !== exceptGameId)) {
      throw new DataError('game-active', 'Finish the current game first.')
    }
  }

  // Replace one game row and bump its updated_at
  function withGame(t: Tables, gameId: Id, patch: Partial<Game>): Tables {
    return { ...t, games: t.games.map(g => g.id === gameId ? { ...g, ...patch, updated_at: stamp() } : g) }
  }

  function newGame(fields: Pick<Game, 'date' | 'location' | 'stakes' | 'default_buy_in_cents' | 'status' | 'started_at'>): Game {
    const at = stamp()
    return {
      id: newId(), group_id: LOCAL_GROUP_ID, duration_minutes: null, notes: '',
      created_by: null, created_at: at, updated_at: at, ...fields,
    }
  }

  function takeSnapshot(gameId: Id): GameSnapshot {
    const entries = tables.game_entries.filter(e => e.game_id === gameId)
    const entryIds = new Set(entries.map(e => e.id))
    return {
      game: getGame(gameId),
      entries,
      buy_ins: tables.buy_ins.filter(b => entryIds.has(b.entry_id)),
      payments: tables.payments.filter(p => p.game_id === gameId),
    }
  }

  function withoutGame(t: Tables, gameId: Id): Tables {
    const entryIds = new Set(t.game_entries.filter(e => e.game_id === gameId).map(e => e.id))
    return {
      ...t,
      games: t.games.filter(g => g.id !== gameId),
      game_entries: t.game_entries.filter(e => e.game_id !== gameId),
      buy_ins: t.buy_ins.filter(b => !entryIds.has(b.entry_id)),
      payments: t.payments.filter(p => p.game_id !== gameId),
    }
  }

  function uniqueName(name: string, exceptId?: Id): string {
    const clean = cleanName(name)
    if (!clean) throw new DataError('invalid-name', 'Enter a name.')
    const existing = findByName(tables.players.filter(p => p.id !== exceptId), clean)
    if (existing) throw new DataError('duplicate-name', `${existing.name} is already on the list.`)
    return clean
  }

  // Recalculate who pays whom, keeping "paid" ticks on payments that didn't
  // change. Returns paid payments that no longer fit, so the screen can
  // tell you instead of dropping them silently.
  async function syncPayments(gameId: Id): Promise<{ clearedPaid: Payment[] }> {
    getGame(gameId)
    const game = snapshot.games.find(g => g.id === gameId)!
    const fresh = settleGame(game)
    const existing = game.payments
    const next = carryOverPaid(fresh, existing)
    const same = next.length === existing.length && next.every((p, i) =>
      p.from_player_id === existing[i].from_player_id && p.to_player_id === existing[i].to_player_id
      && p.amount_cents === existing[i].amount_cents && p.paid === existing[i].paid)
    if (!same) {
      const rows: Payment[] = next.map(p => ({ ...p, id: newId(), game_id: gameId }))
      commit(withGame({ ...tables, payments: [...tables.payments.filter(p => p.game_id !== gameId), ...rows] }, gameId, {}))
    }
    return { clearedPaid: unmatchedPaid(fresh, existing) }
  }

  return {
    // ---- reading ----
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    getSnapshot: () => snapshot,
    snapshotGame: takeSnapshot,
    // Re-read storage (another tab on the same phone changed it)
    reload() {
      tables = readTables(storage)
      snapshot = joinTables(tables)
      listeners.forEach(l => l())
    },

    // ---- players ----
    async addPlayer(name: string): Promise<Player> {
      const player: Player = {
        id: newId(), group_id: LOCAL_GROUP_ID, name: uniqueName(name),
        emoji: pickEmoji(tables.players), photo_path: null, user_id: null,
        archived: false, created_at: stamp(),
      }
      commit({ ...tables, players: [...tables.players, player] })
      return player
    },

    async updatePlayer(id: Id, patch: Partial<Pick<Player, 'name' | 'emoji' | 'photo_path'>>): Promise<void> {
      if (!tables.players.some(p => p.id === id)) throw new DataError('not-found', 'That player no longer exists.')
      const name = patch.name === undefined ? undefined : uniqueName(patch.name, id)
      commit({
        ...tables,
        players: tables.players.map(p => p.id === id ? { ...p, ...patch, ...(name ? { name } : {}) } : p),
      })
    },

    // ---- starting and logging games ----
    async startGame(opts: { date: string, location: string, stakes: string, buyInCents: number, playerIds: Id[] }): Promise<Id> {
      checkNoOtherActive()
      checkAmount(opts.buyInCents)
      if (opts.buyInCents === 0) throw new DataError('invalid-amount', 'The buy-in must be more than $0.')
      if (opts.playerIds.length < 2) throw new DataError('too-few-players', 'Pick at least two players.')
      const game = newGame({
        date: opts.date, location: opts.location.trim(), stakes: opts.stakes.trim(),
        default_buy_in_cents: opts.buyInCents, status: 'active', started_at: stamp(),
      })
      const entries: GameEntry[] = opts.playerIds.map(player_id => ({
        id: newId(), game_id: game.id, player_id, cash_out_cents: null, created_at: game.created_at,
      }))
      const buyIns: BuyIn[] = entries.map(e => ({
        id: newId(), entry_id: e.id, amount_cents: opts.buyInCents, created_at: game.created_at,
      }))
      commit({
        ...tables,
        games: [...tables.games, game],
        game_entries: [...tables.game_entries, ...entries],
        buy_ins: [...tables.buy_ins, ...buyIns],
      })
      return game.id
    },

    // "Log a finished game": each player's total in and out, saved as completed
    async logGame(opts: {
      date: string, location: string, stakes: string,
      rows: { playerId: Id, inCents: number, outCents: number }[]
    }): Promise<Id> {
      if (opts.rows.length < 2) throw new DataError('too-few-players', 'Pick at least two players.')
      opts.rows.forEach(r => { checkAmount(r.inCents); checkAmount(r.outCents) })
      const game = newGame({
        date: opts.date, location: opts.location.trim(), stakes: opts.stakes.trim(),
        default_buy_in_cents: 2000, status: 'completed', started_at: null,
      })
      const entries: GameEntry[] = opts.rows.map(r => ({
        id: newId(), game_id: game.id, player_id: r.playerId, cash_out_cents: r.outCents, created_at: game.created_at,
      }))
      const buyIns: BuyIn[] = entries.map((e, i) => ({
        id: newId(), entry_id: e.id, amount_cents: opts.rows[i].inCents, created_at: game.created_at,
      }))
      const payments: Payment[] = settleUp(opts.rows.map(r => ({ player_id: r.playerId, net_cents: r.outCents - r.inCents })))
        .map(t => ({ ...t, id: newId(), game_id: game.id, paid: false, paid_at: null }))
      commit({
        ...tables,
        games: [...tables.games, game],
        game_entries: [...tables.game_entries, ...entries],
        buy_ins: [...tables.buy_ins, ...buyIns],
        payments: [...tables.payments, ...payments],
      })
      return game.id
    },

    // ---- during a game ----
    async addBuyIn(entryId: Id, cents: number): Promise<void> {
      checkAmount(cents)
      const entry = getEntry(entryId)
      const buyIn: BuyIn = { id: newId(), entry_id: entryId, amount_cents: cents, created_at: stamp() }
      commit(withGame({ ...tables, buy_ins: [...tables.buy_ins, buyIn] }, entry.game_id, {}))
    },

    async removeBuyIn(buyInId: Id): Promise<void> {
      const buyIn = tables.buy_ins.find(b => b.id === buyInId)
      if (!buyIn) throw new DataError('not-found', 'That buy-in no longer exists.')
      const entry = getEntry(buyIn.entry_id)
      commit(withGame({ ...tables, buy_ins: tables.buy_ins.filter(b => b.id !== buyInId) }, entry.game_id, {}))
    },

    // null puts the player back in the game
    async setCashOut(entryId: Id, cents: number | null): Promise<void> {
      if (cents !== null) checkAmount(cents)
      const entry = getEntry(entryId)
      commit(withGame({
        ...tables,
        game_entries: tables.game_entries.map(e => e.id === entryId ? { ...e, cash_out_cents: cents } : e),
      }, entry.game_id, {}))
    },

    // Add a player mid-game with the game's default buy-in
    async addEntry(gameId: Id, playerId: Id): Promise<void> {
      const game = getGame(gameId)
      if (tables.game_entries.some(e => e.game_id === gameId && e.player_id === playerId)) return
      const at = stamp()
      const entry: GameEntry = { id: newId(), game_id: gameId, player_id: playerId, cash_out_cents: null, created_at: at }
      const buyIn: BuyIn = { id: newId(), entry_id: entry.id, amount_cents: game.default_buy_in_cents, created_at: at }
      commit(withGame({
        ...tables,
        game_entries: [...tables.game_entries, entry],
        buy_ins: [...tables.buy_ins, buyIn],
      }, gameId, {}))
    },

    async removeEntry(entryId: Id): Promise<void> {
      const entry = getEntry(entryId)
      commit(withGame({
        ...tables,
        game_entries: tables.game_entries.filter(e => e.id !== entryId),
        buy_ins: tables.buy_ins.filter(b => b.entry_id !== entryId),
      }, entry.game_id, {}))
    },

    // ---- settling up ----
    syncPayments,

    async completeGame(gameId: Id): Promise<void> {
      const game = getGame(gameId)
      if (tables.game_entries.some(e => e.game_id === gameId && e.cash_out_cents === null)) {
        throw new DataError('still-playing', 'Cash everyone out first.')
      }
      await syncPayments(gameId)
      // Keep the first duration if the game was reopened to fix something
      const minutes = game.started_at ? minutesSince(game.started_at, now().getTime()) : 0
      const duration = game.duration_minutes ?? (minutes >= 1 ? minutes : null)
      commit(withGame(tables, gameId, { status: 'completed', duration_minutes: duration }))
    },

    async reopenGame(gameId: Id): Promise<void> {
      getGame(gameId)
      checkNoOtherActive(gameId)
      commit(withGame(tables, gameId, { status: 'active' }))
    },

    async setPaid(paymentId: Id, paid: boolean): Promise<void> {
      const payment = tables.payments.find(p => p.id === paymentId)
      if (!payment) throw new DataError('not-found', 'That payment no longer exists.')
      commit(withGame({
        ...tables,
        payments: tables.payments.map(p => p.id === paymentId ? { ...p, paid, paid_at: paid ? stamp() : null } : p),
      }, payment.game_id, {}))
    },

    async setNotes(gameId: Id, notes: string): Promise<void> {
      getGame(gameId)
      commit(withGame(tables, gameId, { notes }))
    },

    // ---- delete and undo ----
    // Returns a snapshot so the Undo button can bring the game back
    async deleteGame(gameId: Id): Promise<GameSnapshot> {
      const saved = takeSnapshot(gameId)
      commit(withoutGame(tables, gameId))
      return saved
    },

    // Put a game back exactly as it was in the snapshot (used by every Undo)
    async restoreGame(saved: GameSnapshot): Promise<void> {
      if (saved.game.status === 'active') checkNoOtherActive(saved.game.id)
      const t = withoutGame(tables, saved.game.id)
      commit({
        ...t,
        games: [...t.games, saved.game],
        game_entries: [...t.game_entries, ...saved.entries],
        buy_ins: [...t.buy_ins, ...saved.buy_ins],
        payments: [...t.payments, ...saved.payments],
      })
    },

    // ---- whole-app data ----
    // A copy of every table (for Undo after loading test data, and later
    // for the admin "Export backup" in Phase 7)
    getTables: (): Tables => tables,

    async replaceAll(next: Tables): Promise<void> {
      commit(next)
    },
  }
}

export type Store = ReturnType<typeof createStore>

// Phone storage, falling back to memory if the browser blocks it
// (some private-browsing modes do)
function browserStorage(): StorageLike {
  try {
    const test = STORAGE_KEY + ':test'
    localStorage.setItem(test, '1')
    localStorage.removeItem(test)
    return localStorage
  } catch {
    const memory = new Map<string, string>()
    return { getItem: k => memory.get(k) ?? null, setItem: (k, v) => { memory.set(k, v) } }
  }
}

export const store = createStore(browserStorage())

// Keep two open tabs on the same phone in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) store.reload() })
}

// Screens call this to read data. It re-renders them whenever data changes.
export function useAppData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
