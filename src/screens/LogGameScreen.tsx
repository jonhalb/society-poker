// "Log a finished game": enter each player's total in and out afterwards
import { useState } from 'react'
import { Avatar } from '../components/Avatar.tsx'
import { BalanceNotice } from '../components/BalanceNotice.tsx'
import { PlayerPicker, WhenAndWhere } from '../components/GameForm.tsx'
import { Page } from '../components/Page.tsx'
import { useToast } from '../components/feedback.ts'
import { useAction } from '../components/useAction.ts'
import { store, useAppData } from '../data/store.ts'
import { todayISO } from '../lib/dates.ts'
import { summarizeLog, type LogRowInput } from '../lib/logForm.ts'
import { findPlayer } from '../lib/players.ts'
import type { Id } from '../lib/types.ts'
import { navigate } from '../router.ts'

export function LogGameScreen() {
  const { players } = useAppData()
  const action = useAction()
  const toast = useToast()
  const [date, setDate] = useState(todayISO)
  const [location, setLocation] = useState('')
  const [stakes, setStakes] = useState('0.25/0.50')
  const [selected, setSelected] = useState<Id[]>([])
  const [amounts, setAmounts] = useState<Record<Id, LogRowInput>>({})
  // The difference that was accepted. If the amounts change, it has to be
  // ticked again.
  const [acceptedDiff, setAcceptedDiff] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const inputs = selected.map(id => amounts[id] ?? { in: '', out: '' })
  const summary = summarizeLog(inputs)
  const complete = selected.length >= 2 && summary.missing === 0
  const accepted = summary.difference === 0 || acceptedDiff === summary.difference
  const ready = complete && accepted && date !== ''

  const setAmount = (id: Id, side: keyof LogRowInput, value: string) =>
    setAmounts(a => ({ ...a, [id]: { ...(a[id] ?? { in: '', out: '' }), [side]: value } }))

  const hint = selected.length < 2 ? 'Pick at least two players.'
    : summary.missing ? `Fill in both amounts for ${summary.missing} more player${summary.missing === 1 ? '' : 's'}.`
    : !date ? 'Pick a date.'
    : ''

  async function save() {
    if (!ready || !summary.rows || saving) return
    setSaving(true)
    const rows = summary.rows.map((r, i) => ({ playerId: selected[i], ...r }))
    const id = await action.run(() => store.logGame({ date, location, stakes, rows }))
    setSaving(false)
    if (!id) return
    navigate({ name: 'game', id }, { replace: true })
    toast.show('Game saved')
  }

  return (
    <Page title="Log a finished game" back={{ name: 'games' }}>
      <WhenAndWhere date={date} onDate={setDate} location={location} onLocation={setLocation} />
      <label className="field">
        <span>Stakes</span>
        <input value={stakes} onChange={e => setStakes(e.target.value)} />
      </label>
      <PlayerPicker selected={selected} onChange={setSelected} />

      {selected.length > 0 && (
        <>
          <div className="month">
            <span className="cap">Totals</span>
            <span className="sub">In includes all rebuys</span>
          </div>
          <div className="list">
            {selected.map((id, i) => {
              const player = findPlayer(players, id)
              const name = player?.name ?? 'Unknown'
              return (
                <div className="row logrow" key={id}>
                  <Avatar player={player} size="sm" />
                  <div className="name ell">{name}</div>
                  <input inputMode="decimal" placeholder="In $" aria-label={`${name} total in`}
                    value={inputs[i].in} onChange={e => setAmount(id, 'in', e.target.value)} />
                  <input inputMode="decimal" placeholder="Out $" aria-label={`${name} cashed out`}
                    value={inputs[i].out} onChange={e => setAmount(id, 'out', e.target.value)} />
                </div>
              )
            })}
          </div>
        </>
      )}

      {complete && (
        <div style={{ marginTop: 12 }}>
          <BalanceNotice
            inCents={summary.inCents}
            outCents={summary.outCents}
            accepted={accepted}
            onAccept={ok => setAcceptedDiff(ok ? summary.difference : null)}
            acceptLabel="Save with this difference"
          />
        </div>
      )}
      <button className="btn primary" disabled={!ready || saving} onClick={save}>Save game</button>
      <div className="hint">{hint}</div>
    </Page>
  )
}
