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

// ---- moving between pages ----
//
// History rules (what the phone's back button does):
// - Opening a page from a list or button adds a history step.
// - Switching tabs replaces the current step, so back leaves the app
//   instead of cycling through tabs.
// - An open sheet adds a step, so back closes the sheet first.
// - "← Back" goes back a step when that step is the page it points to,
//   and otherwise replaces the current step.

interface HistoryState {
  from?: string // address of the page this one was opened from
  sheet?: boolean // this step only exists because a sheet is open
}

const currentState = (): HistoryState => (window.history.state ?? {}) as HistoryState
const notify = () => window.dispatchEvent(new HashChangeEvent('hashchange'))

// Sheet bookkeeping: is there a history step for an open sheet, and are we
// about to remove it?
let sheetStep = false
let pendingBack: number | undefined
let closeSheetOnBack: (() => void) | null = null

export function navigate(route: Route, opts: { replace?: boolean } = {}) {
  const url = href(route)
  let replace = opts.replace ?? false
  if (pendingBack !== undefined) {
    // A sheet just closed and its history step hasn't been removed yet:
    // reuse that step for the new page instead
    window.clearTimeout(pendingBack)
    pendingBack = undefined
    sheetStep = false
    replace = true
  }
  if (url === window.location.hash && !replace) return
  if (replace) {
    const from = currentState().sheet ? undefined : currentState().from
    window.history.replaceState({ from } satisfies HistoryState, '', url)
  } else {
    window.history.pushState({ from: window.location.hash || '#/' } satisfies HistoryState, '', url)
  }
  notify()
}

// Tabs: swap the page without adding a history step
export function switchTab(route: Route) {
  navigate(route, { replace: true })
}

// "← Back": step back if the previous page is where we're going,
// otherwise swap to it
export function goBack(to: Route) {
  if (currentState().from !== href(to)) return navigate(to, { replace: true })
  let steps = 1
  if (pendingBack !== undefined) {
    // A sheet just closed and its history step is still there: step back past it too
    window.clearTimeout(pendingBack)
    pendingBack = undefined
    sheetStep = false
    steps = 2
  }
  window.history.go(-steps)
}

// Called by the sheet when it opens. `onBack` closes it when the phone's
// back button is pressed.
export function sheetOpened(onBack: () => void) {
  closeSheetOnBack = onBack
  if (pendingBack !== undefined) {
    // Closing one sheet and opening another straight away: keep the step
    window.clearTimeout(pendingBack)
    pendingBack = undefined
    return
  }
  if (!sheetStep) {
    window.history.pushState({ ...currentState(), sheet: true } satisfies HistoryState, '', window.location.hash || '#/')
    sheetStep = true
  }
}

// Called by the sheet when it's closed by a button or the dark area.
// Removing the history step waits a moment in case a page change follows.
export function sheetClosed() {
  closeSheetOnBack = null
  if (sheetStep && pendingBack === undefined) {
    pendingBack = window.setTimeout(() => {
      pendingBack = undefined
      sheetStep = false
      window.history.back()
    }, 0)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    // Back pressed while a sheet was open: close it and stay on the page
    if (sheetStep && pendingBack === undefined) {
      sheetStep = false
      const close = closeSheetOnBack
      closeSheetOnBack = null
      close?.()
    }
  })
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener('popstate', onChange)
  }
}

// The current page address. Screens re-render when it changes.
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}
