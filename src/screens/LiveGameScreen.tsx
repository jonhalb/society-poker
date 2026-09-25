// A game in progress: rebuys, cash-outs, and what's still in play
import { useState } from 'react'
import { AmountSheet } from '../components/AmountSheet.tsx'
import { Avatar } from '../components/Avatar.tsx'
import { Page } from '../components/Page.tsx'
import { useSheet, useToast } from '../components/feedback.ts'
import { useAction } from '../components/useAction.ts'
import { useNow } from '../components/useNow.ts'
import { useWakeLock } from '../components/useWakeLock.ts'
import { store, useAppData } from '../data/store.ts'
import { formatDuration } from '../lib/dates.ts'
import {
  buyInCount, cashedOutCents, gameClock, isPlaying, lastBuyIn, lastPlayerPrefill,
  net, potCents, stillInPlayCents, totalIn,
} from '../lib/game.ts'
import { formatMoney, formatSigned, tone } from '../lib/money.ts'
import { cleanName, findByName, findPlayer } from '../lib/players.ts'
import type { EntryWithBuyIns, GameWithEntries } from '../lib/types.ts'
import { goBack, navigate } from '../router.ts'

export function LiveGameScreen({ game }: { game: GameWithEntries }) {
  const sheet = useSheet()
  const toast = useToast()
  const action = useAction()
  const now = useNow()
  const [showCashed, setShowCashed] = useState(false)
  useWakeLock(true)

  const pot = potCents(game)
  const cashed = cashedOutCents(game)
  const left = stillInPlayCents(game)
  const playing = game.game_entries.filter(isPlaying)
  const out = game.game_entries.filter(e => !isPlaying(e))
  const clock = gameClock(game, now)

  function confirmCancel() {
    sheet.open(<>
      <h3>Cancel this game?</h3>
      <p className="sub" style={{ fontSize: 16, margin: '0 0 6px' }}>All buy-ins and cash-outs from this game will be removed.</p>
      <div className="menu">
        <button className="btn danger" onClick={cancelGame}>Cancel game</button>
        <button className="btn quiet" onClick={sheet.close}>Keep it</button>
      </div>
    </>)
  }

  async function cancelGame() {
    sheet.close()
    const saved = await action.run(() => store.deleteGame(game.id))
    if (!saved) return
    goBack({ name: 'games' })
    toast.show('Game cancelled', () => store.restoreGame(saved))
  }

  return (
    <Page title={game.location || 'Live game'} back={{ name: 'games' }}>
      <section className="hero">
        {out.length ? (
          <>
            <div className="split">
              <div>
                <div className="cap">Total pot</div>
                <div className="mono gold">{formatMoney(pot)}</div>
              </div>
              <div className="divider" />
              <div>
                <div className="cap">Still in play</div>
                <div className={`mono ${left < 0 ? 'loss' : 'win'}`}>{left < 0 ? '−' : ''}{formatMoney(left)}</div>
              </div>
            </div>
            <div className="sub" style={{ margin: '4px 0 10px' }}>
              {formatMoney(cashed)} already cashed out{left < 0 && '. Cash-outs are more than the pot, check the amounts.'}
            </div>
          </>
        ) : (
          <>
            <div className="cap">In the pot</div>
            <div className="mono big gold">{formatMoney(pot)}</div>
          </>
        )}
        <div className="meta">
          <span><b>{playing.length}</b> of {game.game_entries.length} playing</span>
          <span><b>{buyInCount(game)}</b> buy-ins</span>
          {clock && <span>⏱ <b>{formatDuration(clock.minutes)}</b>{!clock.running && ' played'}</span>}
        </div>
      </section>

      {playing.length
        ? <div className="list">{playing.map(e => <LiveRow key={e.id} game={game} entry={e} />)}</div>
        : <div className="empty">Everyone has cashed out.</div>}

      {out.length > 0 && (
        <details className="cashed" open={showCashed || !playing.length} onToggle={e => setShowCashed(e.currentTarget.open)}>
          <summary>
            <span className="cap">Cashed out ({out.length})</span>
            <span className="sub">{formatMoney(cashed)}</span>
            <span className="chev" aria-hidden="true">▾</span>
          </summary>
          <div className="list">{out.map(e => <LiveRow key={e.id} game={game} entry={e} />)}</div>
        </details>
      )}

      <button className="btn ghost" onClick={() => sheet.open(<AddPlayerSheet game={game} />)}>Add a player</button>
      <button className="btn primary" disabled={playing.length > 0} onClick={() => navigate({ name: 'settle', id: game.id })}>Settle up</button>
      <div className="hint">{playing.length ? 'Cash everyone out to settle up. Tap a name for more options.' : 'Ready to settle.'}</div>
      <button className="btn quiet danger-text" onClick={confirmCancel}>Cancel this game</button>
    </Page>
  )
}

// One player: tap the name for more options. Still playing shows Rebuy and
// Cash out; cashed out shows the amount, which can be tapped to change it.
function LiveRow({ game, entry }: { game: GameWithEntries, entry: EntryWithBuyIns }) {
  const { players } = useAppData()
  const sheet = useSheet()
  const action = useAction()
  const player = findPlayer(players, entry.player_id)
  const name = player?.name ?? 'Unknown'
  const count = entry.buy_ins.length
  const result = net(entry)

  function rebuy() {
    const cents = game.default_buy_in_cents
    action.onGame(game.id, () => store.addBuyIn(entry.id, cents), `${name} rebought for ${formatMoney(cents)}`)
  }

  function cashOut() {
    const prefill = entry.cash_out_cents === null ? lastPlayerPrefill(game, entry.id) : null
    sheet.open(
      <AmountSheet
        title={`Cash out ${name}`}
        label="Save cash-out"
        initialCents={entry.cash_out_cents ?? prefill}
        note={prefill !== null ? "Last player, so this is pre-filled with what's left in play." : undefined}
        onSubmit={cents => action.onGame(game.id, () => store.setCashOut(entry.id, cents), `${name} cashed out ${formatMoney(cents)}`)}
      />,
    )
  }

  return (
    <div className="row">
      <button className="who" onClick={() => sheet.open(<PlayerMenu game={game} entry={entry} name={name} />)}>
        <Avatar player={player} />
        <div className="grow">
          <div className="name ell">{name}</div>
          <div className="sub">In {formatMoney(totalIn(entry))}{count > 1 && `, ${count} buy-ins`}</div>
        </div>
      </button>
      <div className="acts">
        {entry.cash_out_cents === null ? (
          <>
            <button className="pill" onClick={rebuy} aria-label={`Rebuy ${name}`}>+{formatMoney(game.default_buy_in_cents)}</button>
            <button className="pill solid" onClick={cashOut}>Cash out</button>
          </>
        ) : (
          <button className="out" onClick={cashOut} aria-label={`Edit cash-out for ${name}`}>
            <div className="val">{formatMoney(entry.cash_out_cents)}</div>
            <div className={`sub ${tone(result)}`} style={{ fontWeight: 600 }}>{formatSigned(result)}</div>
          </button>
        )}
      </div>
    </div>
  )
}

// Tap a name: custom buy-in, remove last buy-in, put back in, remove from game
function PlayerMenu({ game, entry, name }: { game: GameWithEntries, entry: EntryWithBuyIns, name: string }) {
  const sheet = useSheet()
  const action = useAction()
  const last = lastBuyIn(entry)

  const change = (run: () => Promise<unknown>, message: string) => {
    sheet.close()
    action.onGame(game.id, run, message)
  }

  function customBuyIn() {
    sheet.open(
      <AmountSheet
        title={`Buy-in for ${name}`}
        label="Add buy-in"
        quick={[5, 10, 20, 50]}
        allowZero={false}
        onSubmit={cents => action.onGame(game.id, () => store.addBuyIn(entry.id, cents), `Added ${formatMoney(cents)} for ${name}`)}
      />,
    )
  }

  return (
    <>
      <h3>{name}</h3>
      <div className="menu">
        <button className="btn" onClick={customBuyIn}>Add a custom buy-in</button>
        {entry.buy_ins.length > 1 && last && (
          <button className="btn" onClick={() => change(() => store.removeBuyIn(last.id), `Removed a buy-in for ${name}`)}>
            Remove last buy-in ({formatMoney(last.amount_cents)})
          </button>
        )}
        {entry.cash_out_cents !== null && (
          <button className="btn" onClick={() => change(() => store.setCashOut(entry.id, null), `${name} is back in`)}>Put back in the game</button>
        )}
        <button className="btn danger" onClick={() => change(() => store.removeEntry(entry.id), `${name} removed from game`)}>Remove from this game</button>
        <button className="btn quiet" onClick={sheet.close}>Cancel</button>
      </div>
    </>
  )
}

// Add someone mid-game, from the roster or by typing a new name
function AddPlayerSheet({ game }: { game: GameWithEntries }) {
  const { players } = useAppData()
  const sheet = useSheet()
  const action = useAction()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const inGame = new Set(game.game_entries.map(e => e.player_id))
  const available = players.filter(p => !p.archived && !inGame.has(p.id))

  function join(playerId: string, name: string) {
    sheet.close()
    action.onGame(game.id, () => store.addEntry(game.id, playerId), `${name} joined`)
  }

  function joinNew() {
    const name = cleanName(newName)
    if (!name) return
    // Same name in any capitalisation: use the existing player
    const existing = findByName(players, name)
    if (existing && inGame.has(existing.id)) return setError(`${existing.name} is already in this game.`)
    if (existing && !existing.archived) return join(existing.id, existing.name)
    sheet.close()
    action.onGame(game.id, async () => {
      const player = await store.addPlayer(name)
      await store.addEntry(game.id, player.id)
    }, `${name} joined`)
  }

  return (
    <>
      <h3>Add a player</h3>
      {available.length > 0 && (
        <div className="picks">
          {available.map(p => (
            <button key={p.id} className="pick" onClick={() => join(p.id, p.name)}>
              <Avatar player={p} size="sm" />{p.name}
            </button>
          ))}
        </div>
      )}
      <div className="addrow">
        <input
          placeholder="Someone new"
          value={newName}
          onChange={e => { setNewName(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') joinNew() }}
          aria-label="New player's name"
        />
        <button type="button" onClick={joinNew}>Add</button>
      </div>
      <div className="err">{error}</div>
      <div className="hint">They start with a {formatMoney(game.default_buy_in_cents)} buy-in.</div>
    </>
  )
}
