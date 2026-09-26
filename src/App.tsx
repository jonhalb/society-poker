import { useEffect } from 'react'
import { Page } from './components/Page.tsx'
import { SheetProvider } from './components/SheetProvider.tsx'
import { TabBar } from './components/TabBar.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import { useAppData } from './data/store.ts'
import { href, tabFor, useRoute, type Route } from './router.ts'
import { GamesScreen } from './screens/GamesScreen.tsx'
import { GameDetailScreen } from './screens/GameDetailScreen.tsx'
import { LiveGameScreen } from './screens/LiveGameScreen.tsx'
import { LogGameScreen } from './screens/LogGameScreen.tsx'
import { NewGameScreen } from './screens/NewGameScreen.tsx'
import { PlayerScreen, PlayersScreen } from './screens/PlayersScreen.tsx'
import { SettleScreen } from './screens/SettleScreen.tsx'
import { StatsScreen } from './screens/StatsScreen.tsx'

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'games': return <GamesScreen />
    case 'new': return <NewGameScreen from={route.from} />
    case 'log': return <LogGameScreen />
    case 'game': return <GameRoute id={route.id} />
    case 'settle': return <SettleScreen id={route.id} />
    case 'players': return <PlayersScreen />
    case 'player': return <PlayerScreen id={route.id} />
    case 'stats': return <StatsScreen />
  }
}

// A game's page: the live screen while it's in progress, otherwise its detail
function GameRoute({ id }: { id: string }) {
  const { games } = useAppData()
  const game = games.find(g => g.id === id)
  if (!game) {
    return (
      <Page title="Game not found" back={{ name: 'games' }}>
        <div className="empty">This game no longer exists.</div>
      </Page>
    )
  }
  return game.status === 'active' ? <LiveGameScreen game={game} /> : <GameDetailScreen game={game} />
}

export default function App() {
  const route = useRoute()
  const address = href(route)

  // Start each new page at the top, like the prototype
  useEffect(() => { window.scrollTo(0, 0) }, [address])

  return (
    <ToastProvider>
      <SheetProvider>
        <div className="app">
          <Screen key={address} route={route} />
        </div>
        <TabBar current={tabFor(route)} />
      </SheetProvider>
    </ToastProvider>
  )
}
