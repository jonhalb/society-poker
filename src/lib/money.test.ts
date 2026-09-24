import { describe, expect, it } from 'vitest'
import { formatMoney, formatSigned, parseDollars, tone } from './money.ts'

describe('formatMoney', () => {
  it('drops cents for whole dollars', () => {
    expect(formatMoney(2000)).toBe('$20')
    expect(formatMoney(0)).toBe('$0')
  })
  it('shows two decimals otherwise', () => {
    expect(formatMoney(2050)).toBe('$20.50')
    expect(formatMoney(5)).toBe('$0.05')
    expect(formatMoney(123456)).toBe('$1234.56')
  })
  it('ignores the sign', () => {
    expect(formatMoney(-2050)).toBe('$20.50')
  })
})

describe('formatSigned', () => {
  it('adds + for wins, a real minus sign for losses, nothing for zero', () => {
    expect(formatSigned(4850)).toBe('+$48.50')
    expect(formatSigned(-2000)).toBe('−$20')
    expect(formatSigned(0)).toBe('$0')
  })
})

describe('tone', () => {
  it('picks green, red or grey', () => {
    expect(tone(1)).toBe('win')
    expect(tone(-1)).toBe('loss')
    expect(tone(0)).toBe('even')
  })
})

describe('parseDollars', () => {
  it('reads whole and decimal amounts as cents', () => {
    expect(parseDollars('20')).toBe(2000)
    expect(parseDollars('12.5')).toBe(1250)
    expect(parseDollars('0.10')).toBe(10)
    expect(parseDollars('.5')).toBe(50)
    expect(parseDollars('0')).toBe(0)
  })
  it('avoids floating-point surprises', () => {
    expect(parseDollars('19.99')).toBe(1999)
    expect(parseDollars('0.29')).toBe(29)
    expect(parseDollars('1.005')).toBe(101)
  })
  it('accepts a leading $ and commas', () => {
    expect(parseDollars(' $1,000 ')).toBe(100000)
  })
  it('rejects blank, negative and junk input', () => {
    expect(parseDollars('')).toBeNull()
    expect(parseDollars('  ')).toBeNull()
    expect(parseDollars('.')).toBeNull()
    expect(parseDollars('-5')).toBeNull()
    expect(parseDollars('abc')).toBeNull()
    expect(parseDollars('1e3')).toBeNull()
    expect(parseDollars('1.2.3')).toBeNull()
  })
})
