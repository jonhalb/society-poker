import { DataError, store } from '../data/store.ts'
import type { Id } from '../lib/types.ts'
import { useToast } from './feedback.ts'

export function errorMessage(e: unknown): string {
  return e instanceof DataError ? e.message : 'Something went wrong. Try again.'
}

// Runs a change and shows a toast if it's refused, so screens don't each
// need their own error handling
export function useAction() {
  const toast = useToast()
  return {
    // Returns the change's result, or undefined if it failed
    async run<T>(change: () => Promise<T>): Promise<T | undefined> {
      try {
        return await change()
      } catch (e) {
        toast.show(errorMessage(e))
        return undefined
      }
    },

    // Changes a game and shows a toast with Undo, which puts the whole game
    // back exactly as it was before
    async onGame(gameId: Id, change: () => Promise<unknown>, message: string): Promise<boolean> {
      try {
        const before = store.snapshotGame(gameId)
        await change()
        toast.show(message, () => store.restoreGame(before))
        return true
      } catch (e) {
        toast.show(errorMessage(e))
        return false
      }
    },
  }
}
