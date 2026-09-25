// Form parts shared by "New game" and "Log a finished game"
import { useState } from 'react'
import { store, useAppData } from '../data/store.ts'
import { findByName } from '../lib/players.ts'
import { recentLocations } from '../lib/stats.ts'
import type { Id } from '../lib/types.ts'
import { Avatar } from './Avatar.tsx'
import { useAction } from './useAction.ts'

// Date, place, and tap-to-fill chips for recent places
export function WhenAndWhere({ date, onDate, location, onLocation }: {
  date: string
  onDate: (date: string) => void
  location: string
  onLocation: (location: string) => void
}) {
  const { games } = useAppData()
  const recent = recentLocations(games)
  return (
    <>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} required onChange={e => onDate(e.target.value)} />
      </label>
      <label className="field">
        <span>Where</span>
        <input placeholder="e.g. Mike's kitchen" value={location} onChange={e => onLocation(e.target.value)} />
      </label>
      {recent.length > 0 && (
        <div className="chips">
          {recent.map(place => (
            <button key={place} type="button" className="pill" onClick={() => onLocation(place)}>{place}</button>
          ))}
        </div>
      )}
    </>
  )
}

// Tap players to pick them, or type a new name to add someone
export function PlayerPicker({ selected, onChange }: {
  selected: Id[] // in the order they were picked
  onChange: (selected: Id[]) => void
}) {
  const { players } = useAppData()
  const action = useAction()
  const [newName, setNewName] = useState('')
  const roster = players.filter(p => !p.archived)

  function toggle(id: Id) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  async function add() {
    if (!newName.trim()) return
    // Same name in any capitalisation: pick the existing player instead
    const existing = findByName(roster, newName)
    const player = existing ?? await action.run(() => store.addPlayer(newName))
    if (!player) return
    if (!selected.includes(player.id)) onChange([...selected, player.id])
    setNewName('')
  }

  return (
    <>
      <div className="cap sect">Who played ({selected.length})</div>
      <div className="picks">
        {roster.map(p => (
          <button key={p.id} type="button" className="pick" aria-pressed={selected.includes(p.id)} onClick={() => toggle(p.id)}>
            <Avatar player={p} size="sm" />{p.name}
          </button>
        ))}
      </div>
      <div className="addrow">
        <input
          placeholder="Add someone new"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          aria-label="New player's name"
        />
        <button type="button" onClick={add}>Add</button>
      </div>
    </>
  )
}
