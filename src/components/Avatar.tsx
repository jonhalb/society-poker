import type { CSSProperties } from 'react'
import { useAppData } from '../data/store.ts'
import { ringNumber } from '../lib/players.ts'
import type { Player } from '../lib/types.ts'

// Round avatar with a coloured ring: the player's photo, or their emoji
export function Avatar({ player, size }: { player: Player | undefined, size?: 'sm' | 'xl' }) {
  const { players } = useAppData()
  const style = { '--c': `var(--ring-${player ? ringNumber(players, player.id) : 1})` } as CSSProperties
  // Photos arrive in step 6 (stored on the phone) and Phase 5 (Supabase Storage)
  const photo = player?.photo_path?.startsWith('data:image/') ? player.photo_path : null
  return (
    <span className={size ? `av ${size}` : 'av'} style={style} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : (player?.emoji || '❔')}
    </span>
  )
}
