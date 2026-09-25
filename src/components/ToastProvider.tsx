import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastApi, type UndoFn } from './feedback.ts'

// How long a toast stays up: longer when it has an Undo button
const PLAIN_MS = 1800
const UNDO_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string, undo?: UndoFn } | null>(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const undoShowing = useRef(false)

  const show = useCallback((message: string, undo?: UndoFn) => {
    window.clearTimeout(timer.current)
    setToast({ message, undo })
    setVisible(true)
    undoShowing.current = !!undo
    timer.current = window.setTimeout(() => {
      setVisible(false)
      undoShowing.current = false
    }, undo ? UNDO_MS : PLAIN_MS)
  }, [])

  const dismissUndo = useCallback(() => {
    if (!undoShowing.current) return
    undoShowing.current = false
    window.clearTimeout(timer.current)
    setVisible(false)
  }, [])

  async function runUndo() {
    const undo = toast?.undo
    if (!undo) return
    setToast({ message: toast.message }) // stop a second tap undoing twice
    try {
      await undo()
      show('Undone')
    } catch (e) {
      show(e instanceof Error ? e.message : "Couldn't undo")
    }
  }

  const api = useMemo<ToastApi>(() => ({ show, dismissUndo }), [show, dismissUndo])
  const canUndo = visible && !!toast?.undo

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={`toast${visible ? ' show' : ''}${canUndo ? ' act' : ''}`} role="status" aria-live="polite">
        {toast && <span>{toast.message}</span>}
        {canUndo && <button className="undo" onClick={runUndo}>Undo</button>}
      </div>
    </ToastContext.Provider>
  )
}
