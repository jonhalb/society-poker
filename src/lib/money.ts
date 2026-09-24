// Money helpers. Amounts are always whole cents.

export type Tone = 'win' | 'loss' | 'even'

// 2000 -> '$20', 2050 -> '$20.50'. Always positive; use formatSigned for +/−.
export function formatMoney(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const rest = abs % 100
  return rest === 0 ? `$${dollars}` : `$${dollars}.${String(rest).padStart(2, '0')}`
}

// 500 -> '+$5', -500 -> '−$5' (a real minus sign), 0 -> '$0'
export function formatSigned(cents: number): string {
  if (cents > 0) return '+' + formatMoney(cents)
  if (cents < 0) return '−' + formatMoney(cents)
  return '$0'
}

// Which colour a result gets: green, red, or grey
export function tone(cents: number): Tone {
  return cents > 0 ? 'win' : cents < 0 ? 'loss' : 'even'
}

// Turns what someone typed ('20', '12.5', '$1,000') into cents.
// Returns null for blank, negative, or unreadable input.
export function parseDollars(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '').trim()
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null
  // Work from the digits rather than multiplying by 100, because decimal
  // maths in JavaScript can be slightly off (1.005 * 100 is 100.4999…)
  const [whole, fraction = ''] = cleaned.split('.')
  const roundUp = Number(fraction[2] ?? '0') >= 5 ? 1 : 0
  const cents = Number(whole || '0') * 100 + Number((fraction + '00').slice(0, 2)) + roundUp
  return Number.isSafeInteger(cents) ? cents : null
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
