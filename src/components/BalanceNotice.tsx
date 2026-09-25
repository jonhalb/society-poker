import { formatMoney } from '../lib/money.ts'

// Green "Balanced" box, or a gold warning when cash-outs don't match
// buy-ins, with a checkbox to go ahead anyway
export function BalanceNotice({ inCents, outCents, accepted, onAccept, acceptLabel, advice }: {
  inCents: number
  outCents: number
  accepted?: boolean
  onAccept?: (accepted: boolean) => void // leave out for a read-only notice
  acceptLabel?: string
  advice?: string
}) {
  const difference = outCents - inCents
  const totals = `${formatMoney(inCents)} in, ${formatMoney(outCents)} out.`
  if (difference === 0) {
    return <div className="notice ok"><strong>Balanced.</strong> {totals}</div>
  }
  return (
    <div className="notice warn">
      <strong>Cash-outs are {formatMoney(difference)} {difference < 0 ? 'short of' : 'over'} the buy-ins.</strong> {totals}
      {advice && ` ${advice}`}
      {onAccept && (
        <label>
          <input type="checkbox" checked={!!accepted} onChange={e => onAccept(e.target.checked)} />
          {acceptLabel}
        </label>
      )}
    </div>
  )
}
