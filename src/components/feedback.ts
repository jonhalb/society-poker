// Hooks for showing a toast or a bottom sheet from any screen.
// The providers that make these work are in ToastProvider.tsx and SheetProvider.tsx.
import { createContext, useContext, type ReactNode } from 'react'

export type UndoFn = () => void | Promise<void>

export interface ToastApi {
  // Shows a short message. With `undo`, it stays longer and has an Undo button.
  show(message: string, undo?: UndoFn): void
}

export interface SheetApi {
  open(content: ReactNode): void
  close(): void
}

export const ToastContext = createContext<ToastApi | null>(null)
export const SheetContext = createContext<SheetApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}

export function useSheet(): SheetApi {
  const api = useContext(SheetContext)
  if (!api) throw new Error('useSheet must be used inside <SheetProvider>')
  return api
}
