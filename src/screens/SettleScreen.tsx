// Settle up: balance check, results, who pays whom, then complete the game
import { useEffect, useState } from 'react'
import { BalanceNotice } from '../components/BalanceNotice.tsx'
import { PaymentsList, ResultsList } from '../components/GameResults.tsx'
import { Page } from '../components/Page.tsx'
import { useToast } from '../components/feedback.ts'
import { useAction } from '../components/useAction.ts'
import { store, useAppData } from '../data/store.ts'
import { balance, isPlaying } from '../lib/game.ts'
import { findPlayer } from '../lib/players.ts'
import { clearedPaidMessage } from '../lib/settle.ts'
import type { Id, Payment } from '../lib/types.ts'
import { goBack } from '../router.ts'

export function SettleScreen({ id }: { id: Id }) {
  const { games, players } = useAppData()
  const action = useAction()
  const toast = useToast()
  const game = games.find(g => g.id === id)
  // Paid payments that an edit changed, so their tick was cleared
  const [cleared, setCleared] = useState<Payment[]>([])
  // The difference that was accepted. If a cash-out changes, tick again.
  const [acceptedDiff, setAcceptedDiff] = useState<number | null>(null)
  const [completing, setCompleting] = useState(false)

  const everyoneOut = !!game && game.game_entries.every(e => !isPlaying(e))
  const canSettle = !!game && game.status === 'active' && everyoneOut

  // Work out who pays whom from the latest cash-outs
  useEffect(() => {
    if (!canSettle) return
    store.syncPayments(id).then(
      result => { if (result.clearedPaid.length) setCleared(result.clearedPaid) },
      () => {},
    )
  }, [id, canSettle])

  const backToGame = () => goBack({ name: 'game', id })

  if (!game || (!canSettle && !completing)) {
    const text = !game ? 'This game no longer exists.'
      : game.status === 'completed' ? 'This game is already complete.'
      : 'Cash everyone out before settling up.'
    return (
      <Page title="Settle up" back={{ name: 'game', id }}>
        <div className="empty">{text}</div>
        {game && <button className="btn quiet" onClick={backToGame}>Back to the game</button>}
      </Page>
    )
  }

  const { inCents, outCents, difference } = balance(game)
  const accepted = difference === 0 || acceptedDiff === difference
  const name = (playerId: Id) => findPlayer(players, playerId)?.name ?? 'Unknown'

  async function complete() {
    if (!accepted || completing) return
    setCompleting(true)
    const done = await action.run(async () => { await store.completeGame(id); return true })
    if (!done) return setCompleting(false)
    // Back to the game's page, which now shows the finished game
    backToGame()
    toast.show('Game saved')
  }

  return (
    <Page title="Settle up" back={{ name: 'game', id }}>
      {cleared.length > 0 && (
        <div className="notice warn">
          <strong>Check these payments.</strong>
          {cleared.map(p => <div key={p.id} style={{ marginTop: 6 }}>{clearedPaidMessage(p, game.payments, name)}</div>)}
          <div style={{ marginTop: 6 }}>Mark them paid again if the money has already changed hands.</div>
        </div>
      )}
      <BalanceNotice
        inCents={inCents}
        outCents={outCents}
        accepted={accepted}
        onAccept={ok => setAcceptedDiff(ok ? difference : null)}
        acceptLabel="Complete with this difference"
        advice="Go back and fix a cash-out, or complete anyway."
      />
      <div className="cap sect">Results</div>
      <ResultsList game={game} />
      <div className="cap sect">Who pays whom ({game.payments.length})</div>
      <PaymentsList game={game} />
      <button className="btn primary" disabled={!accepted || completing} onClick={complete}>Complete game</button>
      <button className="btn quiet" onClick={backToGame}>Back to the game</button>
    </Page>
  )
}
