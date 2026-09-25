import { useEffect } from 'react'

// Keeps the phone's screen from turning off while `on` is true (during a
// live game). Browsers only allow this over HTTPS, so during plain-HTTP
// testing on the local network it quietly does nothing.
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let asking = false
    let stopped = false

    async function request() {
      if (lock || asking || document.visibilityState !== 'visible') return
      asking = true
      try {
        const next = await navigator.wakeLock.request('screen')
        if (stopped) { next.release().catch(() => {}); return }
        lock = next
        next.addEventListener('release', () => { if (lock === next) lock = null })
      } catch {
        // Refused (no HTTPS, battery saver): carry on without it
      } finally {
        asking = false
      }
    }

    // The phone drops the lock when you switch apps, so ask again on return
    document.addEventListener('visibilitychange', request)
    request()
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', request)
      lock?.release().catch(() => {})
      lock = null
    }
  }, [on])
}
