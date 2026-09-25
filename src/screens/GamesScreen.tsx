// Games tab: start or resume a game, "Still owed", and past games by month
import { Avatar } from '../components/Avatar.tsx'
import { Page } from '../components/Page.tsx'
import { useAction } from '../components/useAction.ts'
import { useNow } from '../components/useNow.ts'
import { store, useAppData } from '../data/store.ts'
import { formatDuration, formatGameDate, minutesSince } from '../lib/dates.ts'
import { isPlaying, net, potCents, topWinner } from '../lib/game.ts'
import { formatMoney, formatSigned, sum } from '../lib/money.ts'
import { findPlayer } from '../lib/players.ts'
import { activeGame, completedGames, monthGroups, unpaidPayments } from '../lib/stats.ts'
import type { GameWithEntries, Payment } from '../lib/types.ts'
import { navigate } from '../router.ts'

export function GamesScreen() {
  const { games } = useAppData()
  const live = activeGame(games)
  const last = completedGames(games)[0]
  const months = monthGroups(games)

  return (
    <Page title="Society Poker">
      {live ? <LiveGameCard game={live} /> : (
        <button className="start" onClick={() => navigate({ name: 'new' })}>
          <div className="grow">
            <div className="big">Start a game</div>
            <div className="sub">Pick players, set the buy-in, deal.</div>
          </div>
          <span className="plus" aria-hidden="true">+</span>
        </button>
      )}

      <div className="qa">
        {!live && last && (
          <button onClick={() => navigate({ name: 'new', from: last.id })}>
            <div className="t">↻ Run it back</div>
            <div className="sub">Same players as {formatGameDate(last.date)}</div>
          </button>
        )}
        <button onClick={() => navigate({ name: 'log' })}>
          <div className="t">✎ Log a finished game</div>
          <div className="sub">Enter final totals</div>
        </button>
      </div>

      <StillOwed />

      {months.length === 0 ? (
        <>
          <div className="cap sect">Past games</div>
          <div className="empty">No finished games yet. Start one above, or log a game you've already played.</div>
        </>
      ) : months.map(month => (
        <section key={month.key}>
          <div className="month">
            <span className="cap">{month.label}</span>
            <span className="sub">{month.games.length} game{month.games.length === 1 ? '' : 's'}, {formatMoney(month.potCents)} in pots</span>
          </div>
          <div className="list">
            {month.games.map(game => <GameRow key={game.id} game={game} />)}
          </div>
        </section>
      ))}
    </Page>
  )
}

function LiveGameCard({ game }: { game: GameWithEntries }) {
  const now = useNow()
  const playing = game.game_entries.filter(isPlaying).length
  const elapsed = game.started_at ? `, ${formatDuration(minutesSince(game.started_at, now))}` : ''
  return (
    <button className="start" onClick={() => navigate({ name: 'game', id: game.id })}>
      <span className="pulse" aria-hidden="true" />
      <div className="grow">
        <div className="big">Game in progress</div>
        <div className="sub">{game.location || 'Home game'}, {playing} still playing{elapsed}</div>
      </div>
      <div className="mono gold amt-live">{formatMoney(potCents(game))}</div>
    </button>
  )
}

// Every unpaid payment across finished games
function StillOwed() {
  const { games, players } = useAppData()
  const action = useAction()
  const owed = unpaidPayments(games)
  if (!owed.length) return null

  const name = (id: string) => findPlayer(players, id)?.name ?? 'Unknown'
  const markPaid = (game: GameWithEntries, p: Payment) =>
    action.onGame(game.id, () => store.setPaid(p.id, true), `${name(p.from_player_id)} paid ${name(p.to_player_id)}`)

  return (
    <>
      <div className="month">
        <span className="cap">Still owed</span>
        <span className="sub">{formatMoney(sum(owed.map(o => o.payment.amount_cents)))} total</span>
      </div>
      <div className="list">
        {owed.map(({ game, payment }) => (
          <div className="row" key={payment.id}>
            <Avatar player={findPlayer(players, payment.from_player_id)} size="sm" />
            <div className="grow">
              <div className="pay">{name(payment.from_player_id)} <span className="arrow">owes</span> {name(payment.to_player_id)}</div>
              <div className="sub">{formatGameDate(game.date)}</div>
            </div>
            <div className="val gold" style={{ fontSize: 17 }}>{formatMoney(payment.amount_cents)}</div>
            <button className="pill" onClick={() => markPaid(game, payment)}>Mark paid</button>
          </div>
        ))}
      </div>
    </>
  )
}

function GameRow({ game }: { game: GameWithEntries }) {
  const { players } = useAppData()
  const winner = topWinner(game)
  const winnerPlayer = winner ? findPlayer(players, winner.player_id) : undefined
  const unpaid = game.payments.filter(p => !p.paid).length
  return (
    <button className="row" onClick={() => navigate({ name: 'game', id: game.id })}>
      <div className="grow">
        <div className="name">{formatGameDate(game.date)}</div>
        <div className="sub">
          {game.location || 'Home game'}, {game.game_entries.length} players, {formatMoney(potCents(game))} pot
          {unpaid > 0 && <>, <span className="loss">{unpaid} unpaid</span></>}
        </div>
      </div>
      {winner && (
        <>
          <Avatar player={winnerPlayer} size="sm" />
          <div style={{ textAlign: 'right', minWidth: 0 }}>
            <div className="name ell" style={{ fontSize: 14 }}>{winnerPlayer?.name ?? 'Unknown'}</div>
            <div className="win" style={{ fontWeight: 700, fontSize: 15 }}>{formatSigned(net(winner))}</div>
          </div>
        </>
      )}
    </button>
  )
}
