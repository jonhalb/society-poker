// Turns a picked photo into a small square JPEG, saved as a
// "data:image/jpeg" address. Phase 5 uploads this to Supabase Storage instead.
import { PHOTO_SIZE, centredSquare, photoProblem } from '../lib/photo.ts'

export async function resizePhoto(file: File): Promise<string> {
  const problem = photoProblem(file)
  if (problem) throw new Error(problem)

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    // Waits for the picture to load; fails for files the browser can't show
    await img.decode().catch(() => { throw new Error("That file couldn't be read as an image. Try a JPG or PNG.") })

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = PHOTO_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("This phone couldn't resize the photo.")
    const { x, y, side } = centredSquare(img.naturalWidth, img.naturalHeight)
    ctx.drawImage(img, x, y, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}
