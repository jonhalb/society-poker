// The plain-text summary for "Share results", ready to paste in a group chat.
import { formatGameDate } from './dates.ts'
import { formatMoney, formatSigned } from './money.ts'
import { net, potCents, sortByNet } from './game.ts'
import type { GameWithEntries, Id } from './types.ts'

export function shareText(game: GameWithEntries, nameOf: (id: Id) => string, payments = game.payments): string {
  const lines = [
    `Poker night, ${formatGameDate(game.date)}${game.location ? ` at ${game.location}` : ''}`,
    `Pot: ${formatMoney(potCents(game))}`,
    '',
    'Results:',
  ]
  for (const e of sortByNet(game.game_entries)) {
    // Plain hyphen, because some chat apps mangle the real minus sign
    lines.push(`${nameOf(e.player_id)}: ${formatSigned(net(e)).replace('−', '-')}`)
  }
  if (payments.length) {
    lines.push('', 'Payments:')
    for (const p of payments) {
      lines.push(`${nameOf(p.from_player_id)} pays ${nameOf(p.to_player_id)} ${formatMoney(p.amount_cents)}${p.paid ? ' (paid)' : ''}`)
    }
  }
  if (game.notes) lines.push('', game.notes)
  return lines.join('\n')
}
