import { describe, expect, it } from 'vitest'
import { shareText } from './share.ts'
import { makeGame } from './test-helpers.ts'

const nameOf = (id: string) => id[0].toUpperCase() + id.slice(1)

describe('shareText', () => {
  it('writes a summary ready to paste in a group chat', () => {
    const g = makeGame({
      id: 'g', date: '2026-06-05', location: "Tom's garage", notes: 'Played until 3am.',
      rows: [['mike', [20], 50.5], ['jess', [20, 20], 9.5]],
      payments: [{ from_player_id: 'jess', to_player_id: 'mike', amount_cents: 3050, paid: true }],
    })
    expect(shareText(g, nameOf)).toBe([
      "Poker night, Fri, Jun 5 at Tom's garage",
      'Pot: $60',
      '',
      'Results:',
      'Mike: +$30.50',
      'Jess: -$30.50',
      '',
      'Payments:',
      'Jess pays Mike $30.50 (paid)',
      '',
      'Played until 3am.',
    ].join('\n'))
  })

  it('leaves out empty parts', () => {
    const g = makeGame({ id: 'g', date: '2026-06-05', rows: [['mike', [20], 20]] })
    expect(shareText(g, nameOf)).toBe('Poker night, Fri, Jun 5\nPot: $20\n\nResults:\nMike: $0')
  })
})
