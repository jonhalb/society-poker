// Random IDs in the same format Supabase uses (UUID v4).
//
// We don't use crypto.randomUUID() because browsers only allow it on HTTPS
// pages, and testing on a phone over the local network is plain HTTP.
// crypto.getRandomValues() works on both.
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // standard variant
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
