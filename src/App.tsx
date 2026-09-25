import { useEffect } from 'react'
import { SheetProvider } from './components/SheetProvider.tsx'
import { TabBar } from './components/TabBar.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import { href, tabFor, useRoute, type Route } from './router.ts'
import { GamesScreen } from './screens/GamesScreen.tsx'
import { LogGameScreen } from './screens/LogGameScreen.tsx'
import { NewGameScreen } from './screens/NewGameScreen.tsx'
import { ComingSoon, GamePlaceholder, PlayersPlaceholder, StatsPlaceholder } from './screens/Placeholders.tsx'

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'games': return <GamesScreen />
    case 'new': return <NewGameScreen from={route.from} />
    case 'log': return <LogGameScreen />
    case 'game': return <GamePlaceholder id={route.id} />
    case 'settle': return <ComingSoon title="Settle up" step={5} back={{ name: 'game', id: route.id }} />
    case 'players': return <PlayersPlaceholder />
    case 'player': return <ComingSoon title="Player" step={6} back={{ name: 'players' }} />
    case 'stats': return <StatsPlaceholder />
  }
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
