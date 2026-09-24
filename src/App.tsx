import { useEffect } from 'react'
import { SheetProvider } from './components/SheetProvider.tsx'
import { TabBar } from './components/TabBar.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import { href, tabFor, useRoute, type Route } from './router.ts'
import { ComingSoon, GamesPlaceholder, PlayersPlaceholder, StatsPlaceholder } from './screens/Placeholders.tsx'

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'games': return <GamesPlaceholder />
    case 'new': return <ComingSoon title="New game" step={3} back={{ name: 'games' }} />
    case 'log': return <ComingSoon title="Log a finished game" step={3} back={{ name: 'games' }} />
    case 'game': return <ComingSoon title="Game" step={4} back={{ name: 'games' }} />
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
