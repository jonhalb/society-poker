// Start a game. With `from`, it's "Run it back": prefilled from that game.
import { useState } from 'react'
import { PlayerPicker, WhenAndWhere } from '../components/GameForm.tsx'
import { Page } from '../components/Page.tsx'
import { useToast } from '../components/feedback.ts'
import { useAction } from '../components/useAction.ts'
import { store, useAppData } from '../data/store.ts'
import { todayISO } from '../lib/dates.ts'
import { formatMoney, parseDollars } from '../lib/money.ts'
import type { Id } from '../lib/types.ts'
import { navigate } from '../router.ts'

export function NewGameScreen({ from }: { from?: Id }) {
  const { games, players } = useAppData()
  const action = useAction()
  const toast = useToast()

  // Starting values: copied from the earlier game for "Run it back"
  const [initial] = useState(() => {
    const source = from ? games.find(g => g.id === from) : undefined
    const active = new Set(players.filter(p => !p.archived).map(p => p.id))
    return {
      location: source?.location ?? '',
      stakes: source?.stakes ?? '0.25/0.50',
      buyIn: source ? formatMoney(source.default_buy_in_cents).slice(1) : '20',
      selected: source ? source.game_entries.map(e => e.player_id).filter(id => active.has(id)) : [],
    }
  })
  const [date, setDate] = useState(todayISO)
  const [location, setLocation] = useState(initial.location)
  const [stakes, setStakes] = useState(initial.stakes)
  const [buyIn, setBuyIn] = useState(initial.buyIn)
  const [selected, setSelected] = useState<Id[]>(initial.selected)
  const [starting, setStarting] = useState(false)

  const buyInCents = parseDollars(buyIn)
  const ready = selected.length >= 2 && buyInCents !== null && buyInCents > 0 && date !== ''
  const hint = selected.length < 2 ? 'Pick at least two players.'
    : buyInCents === null || buyInCents === 0 ? 'Enter a buy-in above $0.'
    : !date ? 'Pick a date.'
    : `Everyone starts with a ${formatMoney(buyInCents)} buy-in.`

  async function start() {
    if (!ready || starting) return
    setStarting(true)
    const id = await action.run(() => store.startGame({ date, location, stakes, buyInCents: buyInCents!, playerIds: selected }))
    setStarting(false)
    if (!id) return
    // Replace this form in history, so back from the game goes to Games
    navigate({ name: 'game', id }, { replace: true })
    toast.show('Game started. Good luck.')
  }

  return (
    <Page title="New game" back={{ name: 'games' }}>
      <WhenAndWhere date={date} onDate={setDate} location={location} onLocation={setLocation} />
      <div className="two">
        <label className="field">
          <span>Stakes</span>
          <input value={stakes} onChange={e => setStakes(e.target.value)} />
        </label>
        <label className="field">
          <span>Buy-in ($)</span>
          <input inputMode="decimal" value={buyIn} onChange={e => setBuyIn(e.target.value)} />
        </label>
      </div>
      <PlayerPicker selected={selected} onChange={setSelected} />
      <button className="btn primary" disabled={!ready || starting} onClick={start}>Start game</button>
      <div className="hint">{hint}</div>
    </Page>
  )
}
