// Rules and maths for player photos. The actual resizing happens in the
// browser (src/components/resizePhoto.ts); this part is plain logic so it
// can be tested.

export const PHOTO_SIZE = 192 // saved photos are 192 × 192 pixels
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB, checked before resizing

// Why a picked file can't be used, or null if it's fine
export function photoProblem(file: { type: string, size: number }): string | null {
  if (!file.type.startsWith('image/')) return 'Pick a photo (JPG or PNG).'
  if (file.size > MAX_PHOTO_BYTES) return 'That photo is over 5 MB. Try a smaller one.'
  return null
}

// The biggest centred square inside a picture, as the part to cut out.
// A 400 × 300 picture gives a 300 × 300 square starting 50 pixels in.
export function centredSquare(width: number, height: number): { x: number, y: number, side: number } {
  const side = Math.min(width, height)
  return { x: (width - side) / 2, y: (height - side) / 2, side }
}
