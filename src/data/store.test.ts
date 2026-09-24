import { describe, expect, it } from 'vitest'
import { potCents } from '../lib/game.ts'
import { STORAGE_KEY, createStore, type StorageLike } from './store.ts'

function memoryStorage(): StorageLike & { data: Map<string, string>, failWrites: boolean } {
  const data = new Map<string, string>()
  return {
    data,
    failWrites: false,
    getItem: k => data.get(k) ?? null,
    setItem(k, v) {
      if (this.failWrites) throw new Error('QuotaExceededError')
      data.set(k, v)
    },
  }
}

// A clock we can move forward by hand
function clock(start = '2026-06-05T19:00:00.000Z') {
  let t = Date.parse(start)
  return { now: () => new Date(t), advance: (minutes: number) => { t += minutes * 60000 } }
}

async function setup() {
  const storage = memoryStorage()
  const time = clock()
  const store = createStore(storage, time.now)
  const mike = await store.addPlayer('Mike')
  const jess = await store.addPlayer('Jess')
  const dan = await store.addPlayer('Dan')
  return { storage, time, store, mike, jess, dan }
}

const gameOf = (store: ReturnType<typeof createStore>, id: string) => store.getSnapshot().games.find(g => g.id === id)!
const entryOf = (store: ReturnType<typeof createStore>, gameId: string, playerId: string) =>
  gameOf(store, gameId).game_entries.find(e => e.player_id === playerId)!

describe('players', () => {
  it('saves players and reads them back after a reload', async () => {
    const { storage } = await setup()
    const again = createStore(storage)
    expect(again.getSnapshot().players.map(p => p.name)).toEqual(['Mike', 'Jess', 'Dan'])
  })

  it('refuses duplicate names regardless of case', async () => {
    const { store } = await setup()
    await expect(store.addPlayer(' mike ')).rejects.toMatchObject({ code: 'duplicate-name' })
  })

  it('refuses a blank name', async () => {
    const { store } = await setup()
    await expect(store.addPlayer('   ')).rejects.toMatchObject({ code: 'invalid-name' })
  })

  it('lets a player keep their own name when editing, but not take someone else’s', async () => {
    const { store, mike } = await setup()
    await store.updatePlayer(mike.id, { name: 'MIKE', emoji: '🦈' })
    expect(store.getSnapshot().players[0]).toMatchObject({ name: 'MIKE', emoji: '🦈' })
    await expect(store.updatePlayer(mike.id, { name: 'jess' })).rejects.toMatchObject({ code: 'duplicate-name' })
  })
})

describe('a live game', () => {
  it('starts with everyone on the default buy-in', async () => {
    const { store, mike, jess } = await setup()
    const id = await store.startGame({ date: '2026-06-05', location: " Tom's garage ", stakes: '0.25/0.50', buyInCents: 2000, playerIds: [mike.id, jess.id] })
    const game = gameOf(store, id)
    expect(game).toMatchObject({ status: 'active', location: "Tom's garage", started_at: '2026-06-05T19:00:00.000Z' })
    expect(game.game_entries.map(e => e.player_id)).toEqual([mike.id, jess.id])
    expect(potCents(game)).toBe(4000)
  })

  it('allows only one live game at a time', async () => {
    const { store, mike, jess } = await setup()
    await store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id, jess.id] })
    await expect(store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id, jess.id] }))
      .rejects.toMatchObject({ code: 'game-active' })
  })

  it('needs two players and a buy-in above $0', async () => {
    const { store, mike, jess } = await setup()
    await expect(store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id] }))
      .rejects.toMatchObject({ code: 'too-few-players' })
    await expect(store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 0, playerIds: [mike.id, jess.id] }))
      .rejects.toMatchObject({ code: 'invalid-amount' })
  })

  it('refuses negative or fractional-cent amounts', async () => {
    const { store, mike, jess } = await setup()
    const id = await store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id, jess.id] })
    const entry = entryOf(store, id, mike.id)
    await expect(store.addBuyIn(entry.id, -500)).rejects.toMatchObject({ code: 'invalid-amount' })
    await expect(store.addBuyIn(entry.id, 10.5)).rejects.toMatchObject({ code: 'invalid-amount' })
    await expect(store.setCashOut(entry.id, -1)).rejects.toMatchObject({ code: 'invalid-amount' })
  })

  it('handles rebuys, removing the last buy-in, cash-outs and putting back in', async () => {
    const { store, time, mike, jess } = await setup()
    const id = await store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id, jess.id] })
    const entry = entryOf(store, id, mike.id)
    time.advance(30)
    await store.addBuyIn(entry.id, 2000)
    time.advance(5)
    await store.addBuyIn(entry.id, 1000)
    expect(entryOf(store, id, mike.id).buy_ins.map(b => b.amount_cents)).toEqual([2000, 2000, 1000])

    const last = entryOf(store, id, mike.id).buy_ins.at(-1)!
    await store.removeBuyIn(last.id)
    expect(potCents(gameOf(store, id))).toBe(6000)

    await store.setCashOut(entry.id, 4550)
    expect(entryOf(store, id, mike.id).cash_out_cents).toBe(4550)
    await store.setCashOut(entry.id, null)
    expect(entryOf(store, id, mike.id).cash_out_cents).toBeNull()
  })

  it('adds and removes players mid-game', async () => {
    const { store, mike, jess, dan } = await setup()
    const id = await store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2500, playerIds: [mike.id, jess.id] })
    await store.addEntry(id, dan.id)
    await store.addEntry(id, dan.id) // adding twice does nothing
    expect(gameOf(store, id).game_entries.map(e => e.player_id)).toEqual([mike.id, jess.id, dan.id])
    expect(entryOf(store, id, dan.id).buy_ins[0].amount_cents).toBe(2500)
    await store.removeEntry(entryOf(store, id, dan.id).id)
    expect(gameOf(store, id).game_entries).toHaveLength(2)
    expect(store.getSnapshot().games[0].game_entries.flatMap(e => e.buy_ins)).toHaveLength(2)
  })
})

describe('settling up', () => {
  async function playedGame() {
    const s = await setup()
    const id = await s.store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [s.mike.id, s.jess.id, s.dan.id] })
    await s.store.setCashOut(entryOf(s.store, id, s.mike.id).id, 4000)
    await s.store.setCashOut(entryOf(s.store, id, s.jess.id).id, 1500)
    return { ...s, id }
  }

  it('won’t complete while someone is still playing', async () => {
    const { store, id } = await playedGame()
    await expect(store.completeGame(id)).rejects.toMatchObject({ code: 'still-playing' })
  })

  it('saves payments and the duration when completed', async () => {
    const { store, time, id, dan, mike, jess } = await playedGame()
    await store.setCashOut(entryOf(store, id, dan.id).id, 500)
    time.advance(162)
    await store.completeGame(id)
    const game = gameOf(store, id)
    expect(game.status).toBe('completed')
    expect(game.duration_minutes).toBe(162)
    expect(game.payments.map(p => [p.from_player_id, p.to_player_id, p.amount_cents])).toEqual([
      [dan.id, mike.id, 1500],
      [jess.id, mike.id, 500],
    ])
  })

  it('keeps the original duration when a reopened game is completed again', async () => {
    const { store, time, id, dan } = await playedGame()
    await store.setCashOut(entryOf(store, id, dan.id).id, 500)
    time.advance(90)
    await store.completeGame(id)
    await store.reopenGame(id)
    time.advance(60 * 24 * 7)
    await store.completeGame(id)
    expect(gameOf(store, id).duration_minutes).toBe(90)
  })

  it('reports a paid payment that changed after an edit, and keeps untouched ones paid', async () => {
    const { store, id, dan, mike } = await playedGame()
    await store.setCashOut(entryOf(store, id, dan.id).id, 500)
    await store.completeGame(id)
    const [danPays, jessPays] = gameOf(store, id).payments
    await store.setPaid(danPays.id, true)
    await store.setPaid(jessPays.id, true)

    // Fix Dan's cash-out: Dan now owes $10, not $15
    await store.reopenGame(id)
    await store.setCashOut(entryOf(store, id, dan.id).id, 1000)
    const { clearedPaid } = await store.syncPayments(id)

    expect(clearedPaid.map(p => [p.from_player_id, p.amount_cents])).toEqual([[dan.id, 1500]])
    const now = gameOf(store, id).payments
    expect(now.find(p => p.from_player_id === dan.id)).toMatchObject({ to_player_id: mike.id, amount_cents: 1000, paid: false })
    expect(now.find(p => p.amount_cents === 500)?.paid).toBe(true)
  })

  it('records when a payment was marked paid', async () => {
    const { store, id, dan } = await playedGame()
    await store.setCashOut(entryOf(store, id, dan.id).id, 500)
    await store.completeGame(id)
    const p = gameOf(store, id).payments[0]
    await store.setPaid(p.id, true)
    expect(gameOf(store, id).payments[0].paid_at).toBe('2026-06-05T19:00:00.000Z')
    await store.setPaid(p.id, false)
    expect(gameOf(store, id).payments[0].paid_at).toBeNull()
  })

  it('won’t reopen a game while another is live', async () => {
    const { store, id, dan, mike, jess } = await playedGame()
    await store.setCashOut(entryOf(store, id, dan.id).id, 500)
    await store.completeGame(id)
    await store.startGame({ date: '2026-06-12', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id, jess.id] })
    await expect(store.reopenGame(id)).rejects.toMatchObject({ code: 'game-active' })
  })
})

describe('logging a finished game', () => {
  it('saves totals as a completed game with payments', async () => {
    const { store, mike, jess } = await setup()
    const id = await store.logGame({
      date: '2026-06-01', location: 'Park', stakes: '0.25/0.50',
      rows: [{ playerId: mike.id, inCents: 4000, outCents: 6550 }, { playerId: jess.id, inCents: 4000, outCents: 1450 }],
    })
    const game = gameOf(store, id)
    expect(game).toMatchObject({ status: 'completed', started_at: null, duration_minutes: null })
    expect(game.payments.map(p => [p.from_player_id, p.amount_cents])).toEqual([[jess.id, 2550]])
  })

  it('refuses negative amounts', async () => {
    const { store, mike, jess } = await setup()
    await expect(store.logGame({
      date: '2026-06-01', location: '', stakes: '',
      rows: [{ playerId: mike.id, inCents: -100, outCents: 0 }, { playerId: jess.id, inCents: 0, outCents: 0 }],
    })).rejects.toMatchObject({ code: 'invalid-amount' })
  })
})

describe('undo and delete', () => {
  it('restores a game exactly as it was before a change', async () => {
    const { store, mike, jess } = await setup()
    const id = await store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id, jess.id] })
    const before = store.snapshotGame(id)
    await store.addBuyIn(entryOf(store, id, mike.id).id, 2000)
    await store.restoreGame(before)
    expect(potCents(gameOf(store, id))).toBe(4000)
  })

  it('deletes a game with everything in it, and can bring it back', async () => {
    const { store, storage, mike, jess } = await setup()
    const id = await store.startGame({ date: '2026-06-05', location: '', stakes: '', buyInCents: 2000, playerIds: [mike.id, jess.id] })
    const saved = await store.deleteGame(id)
    const stored = JSON.parse(storage.data.get(STORAGE_KEY)!).tables
    expect([stored.games, stored.game_entries, stored.buy_ins]).toEqual([[], [], []])
    await store.restoreGame(saved)
    expect(potCents(gameOf(store, id))).toBe(4000)
  })
})

describe('storage problems', () => {
  it('changes nothing and reports an error when saving fails', async () => {
    const { store, storage } = await setup()
    storage.failWrites = true
    await expect(store.addPlayer('Priya')).rejects.toMatchObject({ code: 'save-failed' })
    expect(store.getSnapshot().players).toHaveLength(3)
  })

  it('keeps unreadable data aside instead of losing it', () => {
    const storage = memoryStorage()
    storage.data.set(STORAGE_KEY, '{not json')
    const store = createStore(storage)
    expect(store.getSnapshot().players).toEqual([])
    expect(storage.data.get(STORAGE_KEY + ':unreadable')).toBe('{not json')
  })
})
