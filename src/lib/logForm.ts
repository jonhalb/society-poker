// Checks the "Log a finished game" form: every player needs a valid total
// in and out, and we compare the totals (the balance check).
import { parseDollars, sum } from './money.ts'

export interface LogRowInput {
  in: string // what was typed, e.g. '40' or '12.50'
  out: string
}

export interface LogSummary {
  missing: number // players whose amounts are blank or invalid
  rows: { inCents: number, outCents: number }[] | null // null until all are valid
  inCents: number
  outCents: number
  difference: number // out minus in: 0 is balanced, negative is short
}

export function summarizeLog(inputs: LogRowInput[]): LogSummary {
  const parsed = inputs.map(r => ({ inCents: parseDollars(r.in), outCents: parseDollars(r.out) }))
  const missing = parsed.filter(r => r.inCents === null || r.outCents === null).length
  if (missing) return { missing, rows: null, inCents: 0, outCents: 0, difference: 0 }
  const rows = parsed as { inCents: number, outCents: number }[]
  const inCents = sum(rows.map(r => r.inCents))
  const outCents = sum(rows.map(r => r.outCents))
  return { missing: 0, rows, inCents, outCents, difference: outCents - inCents }
}
