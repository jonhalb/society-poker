import { describe, expect, it } from 'vitest'
import { MAX_PHOTO_BYTES, centredSquare, photoProblem } from './photo.ts'

describe('photoProblem', () => {
  it('accepts images up to 5 MB', () => {
    expect(photoProblem({ type: 'image/jpeg', size: 1000 })).toBeNull()
    expect(photoProblem({ type: 'image/png', size: MAX_PHOTO_BYTES })).toBeNull()
  })

  it('refuses files that are not images', () => {
    expect(photoProblem({ type: 'application/pdf', size: 1000 })).toMatch(/Pick a photo/)
    expect(photoProblem({ type: '', size: 1000 })).toMatch(/Pick a photo/)
  })

  it('refuses images over 5 MB', () => {
    expect(photoProblem({ type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 })).toMatch(/over 5 MB/)
  })
})

describe('centredSquare', () => {
  it('cuts the middle out of a wide picture', () => {
    expect(centredSquare(400, 300)).toEqual({ x: 50, y: 0, side: 300 })
  })

  it('cuts the middle out of a tall picture', () => {
    expect(centredSquare(300, 500)).toEqual({ x: 0, y: 100, side: 300 })
  })

  it('keeps a square picture whole', () => {
    expect(centredSquare(192, 192)).toEqual({ x: 0, y: 0, side: 192 })
  })
})
