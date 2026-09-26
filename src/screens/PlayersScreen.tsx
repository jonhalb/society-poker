// Players tab, a player's profile, and the Edit player sheet
import { useState } from 'react'
import { Avatar } from '../components/Avatar.tsx'
import { useSheet, useToast } from '../components/feedback.ts'
import { Page } from '../components/Page.tsx'
import { resizePhoto } from '../components/resizePhoto.ts'
import { errorMessage, useAction } from '../components/useAction.ts'
import { store, useAppData } from '../data/store.ts'
import { formatGameDate } from '../lib/dates.ts'
import { formatMoney, formatSigned, tone } from '../lib/money.ts'
import { EMOJIS, findPlayer } from '../lib/players.ts'
import { playerStats, rankPlayers } from '../lib/stats.ts'
import type { Id, Player } from '../lib/types.ts'
import { navigate } from '../router.ts'

export function PlayersScreen() {
  const { players, games } = useAppData()
  const action = useAction()
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const list = rankPlayers(players.filter(p => !p.archived), games)

  async function add() {
    if (!newName.trim()) return
    const player = await action.run(() => store.addPlayer(newName))
    if (!player) return
    setNewName('')
    toast.show(`Added ${player.name}`)
  }

  return (
    <Page title="Players">
      <div className="addrow" style={{ marginTop: 0, marginBottom: 18 }}>
        <input
          placeholder="New player name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          aria-label="New player's name"
        />
        <button type="button" onClick={add}>Add</button>
      </div>
      {list.length === 0 ? (
        <div className="empty">No players yet. Add your group here, or add them as you start a game.</div>
      ) : (
        <div className="list">
          {list.map(({ player, stats }) => (
            <button className="row" key={player.id} onClick={() => navigate({ name: 'player', id: player.id })}>
              <Avatar player={player} />
              <div className="grow">
                <div className="name">{player.name}</div>
                <div className="sub">{stats.played ? `${stats.played} sessions, ${stats.wins}W / ${stats.losses}L` : 'No games yet'}</div>
              </div>
              <div className={`val ${tone(stats.total)}`}>{formatSigned(stats.total)}</div>
            </button>
          ))}
        </div>
      )}
    </Page>
  )
}

export function PlayerScreen({ id }: { id: Id }) {
  const { players, games } = useAppData()
  const sheet = useSheet()
  const player = findPlayer(players, id)
  if (!player) {
    return (
      <Page title="Player not found" back={{ name: 'players' }}>
        <div className="empty">This player no longer exists.</div>
      </Page>
    )
  }

  const st = playerStats(player.id, games)
  const tile = (label: string, value: string, className = '') => (
    <div className="tile"><div className="tl">{label}</div><div className={`tv ${className}`}>{value}</div></div>
  )

  return (
    <Page
      title={player.name}
      hideTitle
      back={{ name: 'players' }}
      action={<button className="hdr-btn" onClick={() => sheet.open(<EditPlayerSheet player={player} />)}>✎ Edit</button>}
    >
      <div className="profile">
        <Avatar player={player} size="xl" />
        <div>
          <div className="pname">{player.name}</div>
          <div className="sub" style={{ fontSize: 16 }}>{st.played} session{st.played === 1 ? '' : 's'} played</div>
        </div>
      </div>

      <section className="hero">
        <div className="cap">Lifetime P&amp;L</div>
        <div className={`mono big ${tone(st.total)}`}>{formatSigned(st.total)}</div>
        <div className="meta">
          <span><b>{st.winRate}%</b> win rate</span>
          <span><b>{st.roi}%</b> ROI</span>
        </div>
      </section>

      {st.lastFive.length > 0 && (
        <div className="card last5">
          <span className="cap">Last {st.lastFive.length}</span>
          <div className="dots">
            {st.lastFive.map(g => (
              <span key={g.game.id} className={`dot ${g.result}`} title={`${formatGameDate(g.game.date)}: ${formatSigned(g.net)}`}>{g.result}</span>
            ))}
          </div>
          <span className="gold" style={{ fontWeight: 700 }}>{st.lastFive.filter(g => g.result === 'W').length}/{st.lastFive.length}</span>
        </div>
      )}

      <div className="grid">
        {tile('Avg / session', formatSigned(st.average), tone(st.total))}
        {tile('Record', `${st.wins}W / ${st.losses}L${st.draws ? ` / ${st.draws}D` : ''}`, 'gold')}
        {tile('Total invested', formatMoney(st.invested))}
        {tile('Total returned', formatMoney(st.returned))}
        {tile('Best session', formatSigned(st.best), 'win')}
        {tile('Worst session', formatSigned(st.worst), 'loss')}
        {tile('Total buy-ins', String(st.buyIns), 'gold')}
        {tile('Top finishes', `${st.topFinishes} 🥇`, 'gold')}
      </div>

      {st.history.length > 0 && (
        <>
          <div className="cap sect">History</div>
          <div className="list">
            {[...st.history].reverse().map(g => (
              <button className="row" key={g.game.id} onClick={() => navigate({ name: 'game', id: g.game.id })}>
                <div className="grow">
                  <div className="name">{formatGameDate(g.game.date)}</div>
                  <div className="sub">{g.game.location || 'Home game'}</div>
                </div>
                <div className={`val ${tone(g.net)}`}>{formatSigned(g.net)}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </Page>
  )
}

// Change a player's name, and either upload a photo or pick an emoji.
// Picking an emoji removes the photo.
function EditPlayerSheet({ player }: { player: Player }) {
  const sheet = useSheet()
  const toast = useToast()
  const [name, setName] = useState(player.name)
  const [emoji, setEmoji] = useState(player.emoji)
  const [photo, setPhoto] = useState(player.photo_path)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function pickPhoto(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = '' // so picking the same file again still works
    if (!file) return
    setError('')
    setBusy(true)
    try {
      setPhoto(await resizePhoto(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo couldn't be used.")
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    const before = { name: player.name, emoji: player.emoji, photo_path: player.photo_path }
    try {
      await store.updatePlayer(player.id, { name, emoji, photo_path: photo })
    } catch (e) {
      return setError(errorMessage(e))
    }
    sheet.close()
    toast.show('Changes saved', () => store.updatePlayer(player.id, before))
  }

  return (
    <>
      <h3>Edit player</h3>
      <div className="photo-row">
        <Avatar player={{ ...player, emoji, photo_path: photo }} size="xl" />
        <div className="acts">
          <label className="pill solid">
            {busy ? 'Resizing…' : 'Upload photo'}
            <input type="file" accept="image/*" disabled={busy} onChange={e => pickPhoto(e.currentTarget)} />
          </label>
          {photo && <button type="button" className="pill" onClick={() => setPhoto(null)}>Remove photo</button>}
        </div>
      </div>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={e => { setName(e.target.value); setError('') }} />
      </label>
      <div className="field"><span>Or pick an emoji</span></div>
      <div className="emojis">
        {EMOJIS.map(e => (
          <button key={e} type="button" aria-pressed={!photo && e === emoji} onClick={() => { setEmoji(e); setPhoto(null) }}>{e}</button>
        ))}
      </div>
      <div className="err">{error}</div>
      <button className="btn primary" disabled={busy} onClick={save}>Save changes</button>
      <button className="btn quiet" onClick={sheet.close}>Cancel</button>
    </>
  )
}
