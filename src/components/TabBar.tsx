import type { MouseEvent } from 'react'
import { href, switchTab, type Route, type Tab } from '../router.ts'

export function TabBar({ current }: { current: Tab }) {
  // Tabs replace the current history step rather than adding one
  const tab = (name: Tab) => {
    const route: Route = { name }
    return {
      href: href(route),
      onClick: (e: MouseEvent) => { e.preventDefault(); switchTab(route) },
      ...(name === current ? { 'aria-current': 'page' as const } : {}),
    }
  }
  return (
    <nav className="tabs" aria-label="Sections">
      <a {...tab('games')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
        Games
      </a>
      <a {...tab('players')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M17.5 14.5c2.2.3 3.6 2 4 4.5" /></svg>
        Players
      </a>
      <a {...tab('stats')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 20V11M10 20V4M16 20v-6M22 20H2" /></svg>
        Stats
      </a>
    </nav>
  )
}
