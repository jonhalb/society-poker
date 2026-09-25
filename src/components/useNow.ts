import { useEffect, useState } from 'react'

// The current time, refreshed every `everyMs` so timers on screen move
export function useNow(everyMs = 30000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs)
    return () => window.clearInterval(timer)
  }, [everyMs])
  return now
}
