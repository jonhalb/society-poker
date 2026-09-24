import { describe, expect, it } from 'vitest'
import { formatDuration, formatGameDate, formatMonth, minutesSince, monthKey, todayISO } from './dates.ts'

describe('dates', () => {
  it('formats a game date without shifting the day', () => {
    expect(formatGameDate('2026-06-05')).toBe('Fri, Jun 5')
    expect(formatGameDate('2026-01-01')).toBe('Thu, Jan 1')
    expect(formatGameDate('2026-12-31')).toBe('Thu, Dec 31')
  })

  it('uses the phone’s local date for today', () => {
    expect(todayISO(new Date(2026, 8, 4, 23, 59))).toBe('2026-09-04')
    expect(todayISO(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
  })

  it('groups and labels months', () => {
    expect(monthKey('2026-06-05')).toBe('2026-06')
    expect(formatMonth('2026-06')).toBe('June 2026')
    expect(formatMonth('2026-12')).toBe('December 2026')
  })

  it('formats durations', () => {
    expect(formatDuration(162)).toBe('2h 42m')
    expect(formatDuration(60)).toBe('1h 0m')
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(0)).toBe('0m')
  })

  it('counts whole minutes since a start time, never negative', () => {
    const start = '2026-06-05T20:00:00.000Z'
    expect(minutesSince(start, Date.parse('2026-06-05T22:42:59.000Z'))).toBe(162)
    expect(minutesSince(start, Date.parse('2026-06-05T19:00:00.000Z'))).toBe(0)
  })
})
