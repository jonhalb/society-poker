// A finished game: pot, results, payments, notes, share, reopen, delete
import { useEffect, useRef, useState } from 'react'
import { BalanceNotice } from '../components/BalanceNotice.tsx'
import { PaymentsList, ResultsList } from '../components/GameResults.tsx'
import { Page } from '../components/Page.tsx'
import { useSheet, useToast } from '../components/feedback.ts'
import { errorMessage, useAction } from '../components/useAction.ts'
import { store, useAppData } from '../data/store.ts'
import { formatDuration, formatGameDate } from '../lib/dates.ts'
import { balance } from '../lib/game.ts'
import { formatMoney } from '../lib/money.ts'
import { findPlayer } from '../lib/players.ts'
import { shareText } from '../lib/share.ts'
import type { GameWithEntries } from '../lib/types.ts'
import { goBack } from '../router.ts'

export function GameDetailScreen({ game }: { game: GameWithEntries }) {
  const { players } = useAppData()
  const sheet = useSheet()
  const toast = useToast()
  const action = useAction()
  const { inCents, outCents, difference } = balance(game)
  const unpaid = game.payments.filter(p => !p.paid).length
  const about = [
    game.location || 'Home game',
    game.stakes,
    game.duration_minutes ? `played for ${formatDuration(game.duration_minutes)}` : '',
  ].filter(Boolean).join(', ')

  function share() {
    const text = shareText(game, id => findPlayer(players, id)?.name ?? 'Unknown')
    sheet.open(<ShareSheet text={text} />)
  }

  async function reopen() {
    // The page stays the same and switches to the live game screen
    if (await action.run(async () => { await store.reopenGame(game.id); return true })) toast.show('Game reopened')
  }

  function confirmDelete() {
    sheet.open(<>
      <h3>Delete this game?</h3>
      <p className="sub" style={{ fontSize: 16, margin: '0 0 6px' }}>It will be removed from history and from everyone's stats.</p>
      <div className="menu">
        <button className="btn danger" onClick={deleteGame}>Delete game</button>
        <button className="btn quiet" onClick={sheet.close}>Keep it</button>
      </div>
    </>)
  }

  async function deleteGame() {
    sheet.close()
    const saved = await action.run(() => store.deleteGame(game.id))
    if (!saved) return
    goBack({ name: 'games' })
    toast.show('Game deleted', () => store.restoreGame(saved))
  }

  return (
    <Page title={formatGameDate(game.date)} back={{ name: 'games' }}>
      <div className="sub" style={{ margin: '-12px 2px 14px' }}>{about}</div>
      <section className="hero">
        <div className="cap">Total pot</div>
        <div className="mono big gold">{formatMoney(inCents)}</div>
        <div className="meta">
          <span><b>{game.game_entries.length}</b> players</span>
          <span>{unpaid ? <><b className="loss">{unpaid}</b> unpaid</> : <b className="win">All settled</b>}</span>
        </div>
      </section>
      {difference !== 0 && <BalanceNotice inCents={inCents} outCents={outCents} />}
      <div className="cap sect">Results</div>
      <ResultsList game={game} />
      <div className="cap sect">Payments</div>
      <PaymentsList game={game} />
      <div className="cap sect">Notes</div>
      <Notes game={game} />
      <button className="btn primary" onClick={share}>Share results</button>
      <button className="btn quiet" onClick={reopen}>Reopen game to edit</button>
      <button className="btn quiet danger-text" onClick={confirmDelete}>Delete game</button>
    </Page>
  )
}

// Saves a moment after typing stops, and straight away when you tap elsewhere
const SAVE_DELAY_MS = 500

function Notes({ game }: { game: GameWithEntries }) {
  const toast = useToast()
  const [text, setText] = useState(game.notes)
  const saved = useRef(game.notes) // what we last saved
  const pending = useRef<string | null>(null) // typed but not saved yet
  const timer = useRef<number | undefined>(undefined)
  const gameId = game.id

  async function save() {
    window.clearTimeout(timer.current)
    const value = pending.current
    pending.current = null
    if (value === null || value === saved.current) return
    saved.current = value
    try {
      await store.setNotes(gameId, value)
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  function change(value: string) {
    setText(value)
    // An Undo now would restore the game from before this typing and wipe it
    toast.dismissUndo()
    pending.current = value
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(save, SAVE_DELAY_MS)
  }

  // Notes changed some other way (e.g. an Undo): show the saved text
  useEffect(() => {
    if (pending.current === null && game.notes !== saved.current) {
      saved.current = game.notes
      setText(game.notes)
    }
  }, [game.notes])

  // Leaving the page: save anything still waiting
  useEffect(() => () => {
    window.clearTimeout(timer.current)
    if (pending.current !== null && pending.current !== saved.current) store.setNotes(gameId, pending.current).catch(() => {})
  }, [gameId])

  return (
    <textarea
      className="notes"
      rows={3}
      placeholder="Anything worth remembering about this game"
      value={text}
      onChange={e => change(e.target.value)}
      onBlur={save}
      aria-label="Notes"
    />
  )
}

// The results as plain text, to copy or send to another app
function ShareSheet({ text }: { text: string }) {
  const sheet = useSheet()
  const toast = useToast()
  const box = useRef<HTMLTextAreaElement>(null)
  // The phone's share menu only exists over HTTPS
  const canShare = typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast.show('Copied. Paste it in your group chat.')
    } catch {
      // Older method, for plain-HTTP testing and older phones
      const el = box.current
      el?.focus()
      el?.setSelectionRange(0, text.length)
      let copied = false
      try { copied = document.execCommand('copy') } catch { /* not supported */ }
      toast.show(copied ? 'Copied. Paste it in your group chat.' : 'Select the text and copy it manually')
    }
  }

  return (
    <>
      <h3>Share results</h3>
      <textarea ref={box} className="notes" rows={10} readOnly value={text} aria-label="Results text" />
      <button className="btn primary" onClick={copy}>Copy text</button>
      {canShare && <button className="btn ghost" onClick={() => navigator.share({ text }).catch(() => {})}>Share to an app</button>}
      <button className="btn quiet" onClick={sheet.close}>Done</button>
    </>
  )
}
