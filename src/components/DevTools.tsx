// Buttons for testing: load the 15 sample games, or wipe everything.
// Only shown in development mode (`npm run dev`). The real built app
// leaves this component and the sample data out entirely.
import { emptyTables, store, useAppData } from '../data/store.ts'
import { useSheet, useToast } from './feedback.ts'

export function DevTools() {
  const sheet = useSheet()
  const toast = useToast()
  const data = useAppData()
  const hasData = data.players.length > 0 || data.games.length > 0

  async function replace(load: () => Promise<Parameters<typeof store.replaceAll>[0]>, message: string) {
    sheet.close()
    const before = store.getTables()
    try {
      await store.replaceAll(await load())
      toast.show(message, () => store.replaceAll(before))
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  function confirmLoad() {
    sheet.open(<>
      <h3>Load test data?</h3>
      <p className="sub" style={{ fontSize: 16, margin: '0 0 6px' }}>This replaces everything with 8 players and 15 sample games from June to September.</p>
      <div className="menu">
        <button className="btn" onClick={() => replace(async () => (await import('../data/sampleData.ts')).sampleTables(), 'Loaded 15 test games')}>Load test data</button>
        <button className="btn quiet" onClick={sheet.close}>Cancel</button>
      </div>
    </>)
  }

  function confirmClear() {
    sheet.open(<>
      <h3>Clear all data?</h3>
      <p className="sub" style={{ fontSize: 16, margin: '0 0 6px' }}>This deletes every player and game saved on this phone.</p>
      <div className="menu">
        <button className="btn danger" onClick={() => replace(async () => emptyTables(), 'All data cleared')}>Clear all data</button>
        <button className="btn quiet" onClick={sheet.close}>Cancel</button>
      </div>
    </>)
  }

  return (
    <>
      <div className="cap sect">Development only</div>
      <button className="btn quiet" onClick={confirmLoad}>Load test data (15 games)</button>
      {hasData && <button className="btn quiet danger-text" onClick={confirmClear}>Clear all data</button>}
    </>
  )
}
