import { describe, expect, it } from 'vitest'
import { EMOJIS, cleanName, findByName, pickEmoji, ringNumber } from './players.ts'
import { makePlayer } from './test-helpers.ts'

describe('names', () => {
  it('tidies spaces', () => {
    expect(cleanName('  Mary   Jane ')).toBe('Mary Jane')
  })
  it('finds duplicates regardless of case and spacing', () => {
    const players = [makePlayer('mike'), makePlayer('jess')]
    expect(findByName(players, '  MIKE ')?.id).toBe('mike')
    expect(findByName(players, 'Dan')).toBeUndefined()
  })
})

describe('pickEmoji', () => {
  it('prefers an emoji nobody has', () => {
    const players = EMOJIS.slice(1).map((emoji, i) => makePlayer(`p${i}`, i, { emoji }))
    expect(pickEmoji(players, () => 0.99)).toBe(EMOJIS[0])
  })
  it('reuses emojis once all are taken', () => {
    const players = EMOJIS.map((emoji, i) => makePlayer(`p${i}`, i, { emoji }))
    expect(EMOJIS).toContain(pickEmoji(players, () => 0.5))
  })
})

describe('ringNumber', () => {
  it('follows the order players were added and wraps after 8', () => {
    const players = Array.from({ length: 10 }, (_, i) => makePlayer(`p${i}`, i)).reverse()
    expect(ringNumber(players, 'p0')).toBe(1)
    expect(ringNumber(players, 'p7')).toBe(8)
    expect(ringNumber(players, 'p8')).toBe(1)
  })
})
