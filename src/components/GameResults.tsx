// Results and payments lists, shared by Settle up and the game detail page
import { store, useAppData } from '../data/store.ts'
import { net, sortByNet, totalIn, totalOut } from '../lib/game.ts'
import { formatMoney, formatSigned, tone } from '../lib/money.ts'
import { findPlayer } from '../lib/players.ts'
import type { GameWithEntries, Payment } from '../lib/types.ts'
import { navigate } from '../router.ts'
import { Avatar } from './Avatar.tsx'
import { useAction } from './useAction.ts'

// Everyone in the game, biggest winner first. Tap someone to see their profile.
export function ResultsList({ game }: { game: GameWithEntries }) {
  const { players } = useAppData()
  return (
    <div className="list">
      {sortByNet(game.game_entries).map(e => {
        const player = findPlayer(players, e.player_id)
        const result = net(e)
        return (
          <button key={e.id} className="row" onClick={() => navigate({ name: 'player', id: e.player_id })}>
            <Avatar player={player} />
            <div className="grow">
              <div className="name ell">{player?.name ?? 'Unknown'}</div>
              <div className="sub">In {formatMoney(totalIn(e))}, out {formatMoney(totalOut(e))}</div>
            </div>
            <div className={`val ${tone(result)}`}>{formatSigned(result)}</div>
          </button>
        )
      })}
    </div>
  )
}

// Who pays whom, each with a Mark paid button
export function PaymentsList({ game }: { game: GameWithEntries }) {
  const { players } = useAppData()
  const action = useAction()
  const name = (id: string) => findPlayer(players, id)?.name ?? 'Unknown'

  if (!game.payments.length) return <div className="empty">No payments needed. Everyone broke even.</div>

  const toggle = (p: Payment) => action.onGame(game.id, () => store.setPaid(p.id, !p.paid),
    p.paid ? 'Marked unpaid' : `${name(p.from_player_id)} paid ${name(p.to_player_id)}`)

  return (
    <div className="list">
      {game.payments.map(p => (
        <div className="row" key={p.id}>
          <Avatar player={findPlayer(players, p.from_player_id)} size="sm" />
          <div className="grow pay">
            {name(p.from_player_id)} <span className="arrow">pays</span> {name(p.to_player_id)}
            <div className="val gold" style={{ textAlign: 'left', marginTop: 2 }}>{formatMoney(p.amount_cents)}</div>
          </div>
          <button className={`pill${p.paid ? ' paid' : ''}`} aria-pressed={p.paid} onClick={() => toggle(p)}>
            {p.paid ? 'Paid ✓' : 'Mark paid'}
          </button>
        </div>
      ))}
    </div>
  )
}
