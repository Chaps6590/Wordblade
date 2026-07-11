import sharp from 'sharp'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...parts] = arg.replace(/^--/, '').split('=')
    return [key, parts.join('=') || 'true']
  })
)

const source = args.source
const destination = args.destination
const frames = Number(args.frames ?? 6)
const columns = Number(args.columns ?? frames)
const rows = Number(args.rows ?? Math.ceil(frames / columns))
const frameWidth = Number(args.frameWidth ?? 512)
const frameHeight = Number(args.frameHeight ?? 512)
const padding = Number(args.padding ?? 20)
const groundMargin = Number(args.groundMargin ?? 24)
const alphaThreshold = Number(args.alphaThreshold ?? 10)

if (!source || !destination) {
  throw new Error('Usage: node normalize-character-spritesheet.mjs --source=... --destination=... [--columns=4 --rows=2 --frames=6]')
}
if (![frames, columns, rows, frameWidth, frameHeight].every(Number.isInteger) || frames < 1 || columns < 1 || rows < 1) {
  throw new Error('frames, columns, rows, frameWidth and frameHeight must be positive integers')
}
if (frames > columns * rows) throw new Error('Grid has fewer cells than requested frames')

const sourceBuffer = await sharp(source).ensureAlpha().png().toBuffer()
const metadata = await sharp(sourceBuffer).metadata()
const extracted = []

function opaqueBounds(data, width, height) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[((y * width) + x) * 4 + 3] <= alphaThreshold) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < 0) return null
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

for (let index = 0; index < frames; index += 1) {
  const column = index % columns
  const row = Math.floor(index / columns)
  const left = Math.round((column * metadata.width) / columns)
  const right = Math.round(((column + 1) * metadata.width) / columns)
  const top = Math.round((row * metadata.height) / rows)
  const bottom = Math.round(((row + 1) * metadata.height) / rows)
  const cellWidth = right - left
  const cellHeight = bottom - top
  const cell = sharp(sourceBuffer).extract({ left, top, width: cellWidth, height: cellHeight }).ensureAlpha()
  const { data, info } = await cell.raw().toBuffer({ resolveWithObject: true })
  const bounds = opaqueBounds(data, info.width, info.height)
  if (!bounds) throw new Error(`Frame ${index + 1} is empty`)
  extracted.push({ cell, bounds })
}

// Una escala común mantiene estable el tamaño aparente durante toda la animación.
const scale = Math.min(
  ...extracted.map(({ bounds }) => Math.min(
    (frameWidth - (padding * 2)) / bounds.width,
    (frameHeight - groundMargin - padding) / bounds.height
  ))
)

const composites = []
for (let index = 0; index < extracted.length; index += 1) {
  const { cell, bounds } = extracted[index]
  const width = Math.max(1, Math.round(bounds.width * scale))
  const height = Math.max(1, Math.round(bounds.height * scale))
  const input = await cell
    .extract(bounds)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer()
  composites.push({
    input,
    left: (index * frameWidth) + Math.round((frameWidth - width) / 2),
    top: frameHeight - groundMargin - height
  })
}

await mkdir(path.dirname(destination), { recursive: true })
await sharp({
  create: {
    width: frameWidth * frames,
    height: frameHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite(composites)
  .png()
  .toFile(destination)

console.log(JSON.stringify({ destination, frames, columns, rows, frameWidth, frameHeight, scale }, null, 2))
