// Date helpers. Game dates are plain 'YYYY-MM-DD' strings. We format them as
// UTC so the day shown never shifts, whatever time zone the phone is in.

const pad = (n: number) => String(n).padStart(2, '0')

function asUtcDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// Today's date on this phone, as 'YYYY-MM-DD'
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// '2026-06-05' -> 'Fri, Jun 5'
export function formatGameDate(date: string): string {
  return asUtcDate(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

// '2026-06-05' -> '2026-06'
export function monthKey(date: string): string {
  return date.slice(0, 7)
}

// '2026-06' -> 'June 2026'
export function formatMonth(key: string): string {
  return asUtcDate(key + '-15').toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

// 162 -> '2h 42m', 45 -> '45m'
export function formatDuration(minutes: number): string {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
}

// Whole minutes since a timestamp (never negative)
export function minutesSince(startIso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(startIso)) / 60000))
}
