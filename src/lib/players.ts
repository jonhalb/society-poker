import type { Id, Player } from './types.ts'

export const EMOJIS = ['🎰', '🦈', '🎲', '👑', '🃏', '🚀', '🐺', '🦊', '🔥', '💎', '🐍', '🎩', '🍀', '⚡', '🐻', '🦉', '🍕', '🌵']

// Matches the --ring-1 … --ring-8 colours in tokens.css
export const RING_COUNT = 8

// Tidy a typed name: trim the ends and squash repeated spaces
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

// Case-insensitive name lookup, so "mike" and "Mike " count as the same person
export function findByName(players: Player[], name: string): Player | undefined {
  const wanted = cleanName(name).toLowerCase()
  return players.find(p => cleanName(p.name).toLowerCase() === wanted)
}

export function findPlayer(players: Player[], id: Id): Player | undefined {
  return players.find(p => p.id === id)
}

// A random emoji nobody is using yet (or any emoji once they're all taken)
export function pickEmoji(players: Player[], random: () => number = Math.random): string {
  const used = new Set(players.map(p => p.emoji))
  const free = EMOJIS.filter(e => !used.has(e))
  const pool = free.length ? free : EMOJIS
  return pool[Math.floor(random() * pool.length)]
}

// Ring colour 1–8, picked by the order players were added, so a player
// keeps the same colour everywhere in the app
export function ringNumber(players: Player[], id: Id): number {
  const ordered = [...players].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  const index = Math.max(0, ordered.findIndex(p => p.id === id))
  return (index % RING_COUNT) + 1
}
