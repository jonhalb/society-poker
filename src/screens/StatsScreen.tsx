// Stats tab: money through the pot, biggest single night, and the leaderboard
import { Avatar } from '../components/Avatar.tsx'
import { DevTools } from '../components/DevTools.tsx'
import { Page } from '../components/Page.tsx'
import { useAppData } from '../data/store.ts'
import { formatGameDate } from '../lib/dates.ts'
import { formatMoney, formatSigned, tone } from '../lib/money.ts'
import { findPlayer } from '../lib/players.ts'
import { groupStats, leaderboard } from '../lib/stats.ts'
import { navigate } from '../router.ts'

export function StatsScreen() {
  const { players, games } = useAppData()
  const group = groupStats(players, games)
  const rows = leaderboard(players, games)
  // The biggest win or loss fills half the bar; everyone else is scaled to it
  const max = Math.max(...rows.map(r => Math.abs(r.stats.total)), 1)
  const best = group.biggestNight
  const bestPlayer = best ? findPlayer(players, best.playerId) : undefined

  return (
    <Page title="Stats">
      <section className="hero">
        <div className="cap">Through the pot</div>
        <div className="mono big gold">{formatMoney(group.throughPot)}</div>
        <div className="meta">
          <span><b>{group.gameCount}</b> games</span>
          <span><b>{group.playerCount}</b> players</span>
        </div>
      </section>

      {best && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <Avatar player={bestPlayer} />
          <div className="grow">
            <div className="sub">Biggest single night</div>
            <div className="name">{bestPlayer?.name ?? 'Unknown'}, {formatGameDate(best.game.date)}</div>
          </div>
          <div className={`val ${tone(best.net)}`}>{formatSigned(best.net)}</div>
        </div>
      )}

      <div className="cap sect">Leaderboard</div>
      {rows.length === 0 ? (
        <div className="empty">Finish a game to start the leaderboard.</div>
      ) : (
        <div className="list">
          {rows.map(({ player, stats }, i) => {
            const width = `${Math.abs(stats.total) / max * 50}%`
            return (
              <button className="lb" key={player.id} onClick={() => navigate({ name: 'player', id: player.id })}>
                <div className="lb-top">
                  <span className="rank">{i + 1}</span>
                  <Avatar player={player} size="sm" />
                  <div className="grow name">{player.name}</div>
                  <div className={`val ${tone(stats.total)}`} style={{ fontSize: 18 }}>{formatSigned(stats.total)}</div>
                </div>
                <div className="track">
                  <span
                    className={`bar ${stats.total >= 0 ? 'pos' : 'neg'}`}
                    style={stats.total >= 0 ? { left: '50%', width } : { right: '50%', width }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {import.meta.env.DEV && <DevTools />}
    </Page>
  )
}
