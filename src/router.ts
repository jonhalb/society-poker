// Page addresses. They live after the # in the URL (e.g. #/game/abc) so
// GitHub Pages can reload any screen without a "page not found" error.
import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'games' }
  | { name: 'new', from?: string } // from: game to copy for "Run it back"
  | { name: 'log' }
  | { name: 'game', id: string } // live game or finished game detail
  | { name: 'settle', id: string }
  | { name: 'players' }
  | { name: 'player', id: string }
  | { name: 'stats' }

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  const params = new URLSearchParams(query)
  switch (parts[0]) {
    case 'new': return params.get('from') ? { name: 'new', from: params.get('from')! } : { name: 'new' }
    case 'log': return { name: 'log' }
    case 'game':
      if (parts[1] && parts[2] === 'settle') return { name: 'settle', id: parts[1] }
      if (parts[1]) return { name: 'game', id: parts[1] }
      break
    case 'players': return { name: 'players' }
    case 'player': if (parts[1]) return { name: 'player', id: parts[1] }; break
    case 'stats': return { name: 'stats' }
  }
  return { name: 'games' }
}

export function href(route: Route): string {
  const id = (s: string) => encodeURIComponent(s)
  switch (route.name) {
    case 'games': return '#/'
    case 'new': return route.from ? `#/new?from=${id(route.from)}` : '#/new'
    case 'log': return '#/log'
    case 'game': return `#/game/${id(route.id)}`
    case 'settle': return `#/game/${id(route.id)}/settle`
    case 'players': return '#/players'
    case 'player': return `#/player/${id(route.id)}`
    case 'stats': return '#/stats'
  }
}

export type Tab = 'games' | 'players' | 'stats'

// Which bottom tab lights up for each page
export function tabFor(route: Route): Tab {
  if (route.name === 'players' || route.name === 'player') return 'players'
  if (route.name === 'stats') return 'stats'
  return 'games'
}

export function navigate(route: Route) {
  window.location.hash = href(route)
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

// The current page address. Screens re-render when it changes.
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}
