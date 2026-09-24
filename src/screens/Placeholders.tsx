// Temporary screens for Phase 1 step 2. Steps 3–6 replace each one with the
// real screen from prototype.html.
import { DevTools } from '../components/DevTools.tsx'
import { Page } from '../components/Page.tsx'
import { useAppData } from '../data/store.ts'
import { completedGames } from '../lib/stats.ts'
import type { Route } from '../router.ts'

export function GamesPlaceholder() {
  const { players, games } = useAppData()
  const finished = completedGames(games).length
  return (
    <Page title="Society Poker">
      <div className="empty">
        <div className="mono gold" style={{ fontSize: 40 }}>{finished}</div>
        finished game{finished === 1 ? '' : 's'} and {players.length} player{players.length === 1 ? '' : 's'} saved on this phone.
        <br />The Games screens arrive in step 3.
      </div>
    </Page>
  )
}

export function PlayersPlaceholder() {
  return (
    <Page title="Players">
      <div className="empty">Players arrive in step 6.</div>
    </Page>
  )
}

export function StatsPlaceholder() {
  return (
    <Page title="Stats">
      <div className="empty">Stats arrive in step 6.</div>
      {import.meta.env.DEV && <DevTools />}
    </Page>
  )
}

// Pages that have an address already but no screen yet
export function ComingSoon({ title, step, back }: { title: string, step: number, back: Route }) {
  return (
    <Page title={title} back={back}>
      <div className="empty">This screen arrives in step {step}.</div>
    </Page>
  )
}
