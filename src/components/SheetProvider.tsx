import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { sheetClosed, sheetOpened } from '../router.ts'
import { SheetContext, type SheetApi } from './feedback.ts'

// Bottom sheet: slides up over the page for quick entry and menus.
// Tap the dark area, press Escape, or use the phone's back button to close.
export function SheetProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null)
  const panel = useRef<HTMLDivElement>(null)

  const open = useCallback((node: ReactNode) => {
    setContent(node)
    sheetOpened(() => setContent(null))
  }, [])
  const close = useCallback(() => {
    setContent(null)
    sheetClosed()
  }, [])
  const api = useMemo<SheetApi>(() => ({ open, close }), [open, close])

  const isOpen = content !== null
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    // Put the cursor in the first box so the keyboard comes up straight away
    const focus = window.setTimeout(() => panel.current?.querySelector('input')?.focus(), 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(focus)
    }
  }, [isOpen, close])

  return (
    <SheetContext.Provider value={api}>
      {children}
      {isOpen && (
        <div>
          <div className="scrim" onClick={close} />
          <div className="panel" role="dialog" aria-modal="true" ref={panel}>
            <div className="grab" />
            {content}
          </div>
        </div>
      )}
    </SheetContext.Provider>
  )
}
