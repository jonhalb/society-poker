// Bottom sheet with one big dollar box, for cash-outs and custom buy-ins
import { useState } from 'react'
import { formatMoney, parseDollars } from '../lib/money.ts'
import { useSheet } from './feedback.ts'

export function AmountSheet({ title, label, initialCents, quick, note, allowZero = true, onSubmit }: {
  title: string
  label: string // the main button's text
  initialCents?: number | null
  quick?: number[] // tap-to-fill dollar amounts
  note?: string
  allowZero?: boolean
  onSubmit: (cents: number) => void
}) {
  const sheet = useSheet()
  const [text, setText] = useState(initialCents == null ? '' : formatMoney(initialCents).slice(1))
  const [error, setError] = useState('')

  function submit() {
    const cents = parseDollars(text)
    if (cents === null || (!allowZero && cents === 0)) {
      return setError(allowZero ? 'Enter an amount of $0 or more.' : 'Enter an amount above $0.')
    }
    sheet.close()
    onSubmit(cents)
  }

  return (
    <>
      <h3>{title}</h3>
      <label className="amt">
        <span>$</span>
        <input
          inputMode="decimal"
          placeholder="0"
          value={text}
          onChange={e => { setText(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          aria-label="Amount in dollars"
        />
      </label>
      {quick && (
        <div className="quick">
          {quick.map(v => <button key={v} type="button" className="pill" onClick={() => { setText(String(v)); setError('') }}>${v}</button>)}
        </div>
      )}
      {note && <div className="hint" style={{ textAlign: 'left', margin: '10px 2px 0' }}>{note}</div>}
      <div className="err">{error}</div>
      <button className="btn primary" onClick={submit}>{label}</button>
      <button className="btn quiet" onClick={sheet.close}>Cancel</button>
    </>
  )
}
