// Placeholder screen for Phase 0: proves the fonts and colours are wired up.
// Phase 1 replaces this with the real screens from prototype.html.
export default function App() {
  return (
    <div className="app" style={{ padding: '40px var(--gutter)', textAlign: 'center' }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 8px' }}>Society Poker</h1>
      <p style={{ color: 'var(--muted)', margin: '0 0 24px' }}>Setup complete. Screens arrive in Phase 1.</p>
      <div className="mono gold" style={{ fontSize: 52 }}>$240</div>
      <p style={{ margin: '12px 0 0' }}>
        <span className="win">+$48.50</span> · <span className="loss">−$20</span>
      </p>
    </div>
  )
}
