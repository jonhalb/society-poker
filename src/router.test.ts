import { describe, expect, it } from 'vitest'
import { href, parseHash, type Route } from './router.ts'

describe('page addresses', () => {
  const routes: Route[] = [
    { name: 'games' },
    { name: 'new' },
    { name: 'new', from: 'abc' },
    { name: 'log' },
    { name: 'game', id: 'abc' },
    { name: 'settle', id: 'abc' },
    { name: 'players' },
    { name: 'player', id: 'abc' },
    { name: 'stats' },
  ]

  it('turns every page into an address and back again', () => {
    for (const route of routes) expect(parseHash(href(route))).toEqual(route)
  })

  it('reads the addresses you would type', () => {
    expect(parseHash('#/game/123')).toEqual({ name: 'game', id: '123' })
    expect(parseHash('#/game/123/settle')).toEqual({ name: 'settle', id: '123' })
  })

  it('falls back to the Games tab for empty or unknown addresses', () => {
    expect(parseHash('')).toEqual({ name: 'games' })
    expect(parseHash('#/nonsense')).toEqual({ name: 'games' })
    expect(parseHash('#/player/')).toEqual({ name: 'games' })
  })
})
