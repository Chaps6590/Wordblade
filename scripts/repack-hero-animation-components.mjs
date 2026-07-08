import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.replace(/^--/, '').split('=')
    return [key, valueParts.join('=') || 'true']
  })
)

const source = args.source
const destination = args.destination
const frames = Number(args.frames ?? 6)
const targetFrameWidth = Number(args.frameWidth ?? 512)
const targetFrameHeight = Number(args.frameHeight ?? 512)
const alphaThreshold = Number(args.alphaThreshold ?? 10)
const minComponentArea = Number(args.minComponentArea ?? 80)
const cropPadding = Number(args.cropPadding ?? 6)
const groundMargin = Number(args.groundMargin ?? 26)
const carryoverRatio = Number(args.carryoverRatio ?? 0.33)
const keepLargestOnly = args.keepLargestOnly !== 'false'

if (!source || !destination) {
  throw new Error('Usage: node repack-hero-animation-components.mjs --source=... --destination=...')
}

const sourceImage = sharp(source).ensureAlpha()
const metadata = await sourceImage.metadata()
const { data } = await sourceImage.raw().toBuffer({ resolveWithObject: true })
const sourceFrameWidth = metadata.width / frames

function alphaAt(x, y) {
  return data[((y * metadata.width) + x) * 4 + 3]
}

function findComponents() {
  const visited = new Uint8Array(metadata.width * metadata.height)
  const components = []
  const queue = new Int32Array(metadata.width * metadata.height)

  for (let y = 0; y < metadata.height; y += 1) {
    for (let x = 0; x < metadata.width; x += 1) {
      const start = y * metadata.width + x
      if (visited[start]) continue
      visited[start] = 1
      if (alphaAt(x, y) <= alphaThreshold) continue

      let head = 0
      let tail = 0
      queue[tail++] = start
      let minX = x
      let minY = y
      let maxX = x
      let maxY = y
      let area = 0

      while (head < tail) {
        const current = queue[head++]
        const cx = current % metadata.width
        const cy = Math.floor(current / metadata.width)
        area += 1
        if (cx < minX) minX = cx
        if (cy < minY) minY = cy
        if (cx > maxX) maxX = cx
        if (cy > maxY) maxY = cy

        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue
            const nx = cx + ox
            const ny = cy + oy
            if (nx < 0 || ny < 0 || nx >= metadata.width || ny >= metadata.height) continue
            const ni = ny * metadata.width + nx
            if (visited[ni]) continue
            visited[ni] = 1
            if (alphaAt(nx, ny) > alphaThreshold) queue[tail++] = ni
          }
        }
      }

      components.push({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        area,
        centerX: minX + ((maxX - minX + 1) / 2)
      })
    }
  }

  return components
}

function unionRect(a, b) {
  if (!a) return b
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}

function expandRect(rect) {
  const x = Math.max(0, Math.floor(rect.x - cropPadding))
  const y = Math.max(0, Math.floor(rect.y - cropPadding))
  const right = Math.min(metadata.width, Math.ceil(rect.x + rect.width + cropPadding))
  const bottom = Math.min(metadata.height, Math.ceil(rect.y + rect.height + cropPadding))
  return { left: x, top: y, width: right - x, height: bottom - y }
}

const slotRects = Array.from({ length: frames }, () => null)
const slotAreas = Array.from({ length: frames }, () => 0)

for (const component of findComponents()) {
  if (component.area < minComponentArea) continue
  let slot = Math.floor(component.centerX / sourceFrameWidth)
  if (slot >= frames) slot = frames - 1
  const positionInSlot = component.centerX - (slot * sourceFrameWidth)
  if (slot > 0 && positionInSlot < sourceFrameWidth * carryoverRatio) slot -= 1

  const rect = {
    x: component.x,
    y: component.y,
    width: component.width,
    height: component.height
  }

  if (keepLargestOnly) {
    if (component.area > slotAreas[slot]) {
      slotAreas[slot] = component.area
      slotRects[slot] = rect
    }
  } else {
    slotRects[slot] = unionRect(slotRects[slot], rect)
  }
}

const composites = []
for (let slot = 0; slot < frames; slot += 1) {
  const fallback = {
    x: Math.floor(slot * sourceFrameWidth),
    y: 0,
    width: Math.floor(sourceFrameWidth),
    height: metadata.height
  }
  const rect = expandRect(slotRects[slot] ?? fallback)
  const scale = Math.min(1, (targetFrameWidth - 24) / rect.width, (targetFrameHeight - groundMargin) / rect.height)
  const width = Math.round(rect.width * scale)
  const height = Math.round(rect.height * scale)
  const left = (slot * targetFrameWidth) + Math.round((targetFrameWidth - width) / 2)
  const top = Math.max(0, Math.round(targetFrameHeight - groundMargin - height))
  const input = await sharp(source)
    .extract(rect)
    .resize(width, height, { fit: 'fill' })
    .png()
    .toBuffer()
  composites.push({ input, left, top })
}

await mkdir(path.dirname(destination), { recursive: true })
await sharp({
  create: {
    width: targetFrameWidth * frames,
    height: targetFrameHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite(composites)
  .png()
  .toFile(destination)

console.log(destination)
