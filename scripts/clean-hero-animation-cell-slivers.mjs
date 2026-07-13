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
const frameWidth = Number(args.frameWidth ?? 512)
const frameHeight = Number(args.frameHeight ?? 512)
const alphaThreshold = Number(args.alphaThreshold ?? 10)
const minComponentArea = Number(args.minComponentArea ?? 30)
const edgeBand = Number(args.edgeBand ?? 14)
const clearEdgeBand = Number(args.clearEdgeBand ?? 20)
const keepMainOnly = args.keepMainOnly === 'true'

if (!source || !destination) {
  throw new Error('Usage: node clean-hero-animation-cell-slivers.mjs --source=... --destination=...')
}

function alphaAt(data, width, x, y) {
  return data[((y * width) + x) * 4 + 3]
}

function findComponents(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  const components = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x
      if (visited[start]) continue
      visited[start] = 1
      if (alphaAt(data, width, x, y) <= alphaThreshold) continue

      let head = 0
      let tail = 0
      queue[tail++] = start
      const pixels = []
      let minX = x
      let minY = y
      let maxX = x
      let maxY = y

      while (head < tail) {
        const current = queue[head++]
        const cx = current % width
        const cy = Math.floor(current / width)
        pixels.push(current)
        if (cx < minX) minX = cx
        if (cy < minY) minY = cy
        if (cx > maxX) maxX = cx
        if (cy > maxY) maxY = cy

        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue
            const nx = cx + ox
            const ny = cy + oy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const ni = ny * width + nx
            if (visited[ni]) continue
            visited[ni] = 1
            if (alphaAt(data, width, nx, ny) > alphaThreshold) queue[tail++] = ni
          }
        }
      }

      components.push({
        pixels,
        area: pixels.length,
        minX,
        minY,
        maxX,
        maxY,
        centerX: minX + ((maxX - minX + 1) / 2)
      })
    }
  }

  return components.filter((component) => component.area >= minComponentArea)
}

const sourceImage = sharp(source).ensureAlpha()
const metadata = await sourceImage.metadata()
if (metadata.width !== frameWidth * frames || metadata.height !== frameHeight) {
  throw new Error(`Unexpected sheet size ${metadata.width}x${metadata.height}`)
}

const cleanedFrames = []
for (let frame = 0; frame < frames; frame += 1) {
  const { data } = await sharp(source)
    .ensureAlpha()
    .extract({ left: frame * frameWidth, top: 0, width: frameWidth, height: frameHeight })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const components = findComponents(data, frameWidth, frameHeight)
  if (components.length > 1) {
    const main = components.reduce((best, component) => {
      const bestDistance = Math.abs(best.centerX - (frameWidth / 2))
      const distance = Math.abs(component.centerX - (frameWidth / 2))
      if (component.area > best.area * 1.25) return component
      if (component.area > best.area * 0.55 && distance < bestDistance) return component
      return best
    }, components[0])

    for (const component of components) {
      const touchesLeft = component.minX <= edgeBand
      const touchesRight = component.maxX >= frameWidth - edgeBand
      const isSmallEdgeCarryover = component !== main && (touchesLeft || touchesRight)
      if (component === main || (!keepMainOnly && !isSmallEdgeCarryover)) continue

      for (const pixel of component.pixels) {
        data[(pixel * 4) + 0] = 0
        data[(pixel * 4) + 1] = 0
        data[(pixel * 4) + 2] = 0
        data[(pixel * 4) + 3] = 0
      }
    }
  }

  if (clearEdgeBand > 0) {
    const clearLeft = frame > 0
    const clearRight = frame < frames - 1
    for (let y = 0; y < frameHeight; y += 1) {
      if (clearLeft) {
        for (let x = 0; x < clearEdgeBand; x += 1) {
          const pixel = (y * frameWidth) + x
          data[(pixel * 4) + 0] = 0
          data[(pixel * 4) + 1] = 0
          data[(pixel * 4) + 2] = 0
          data[(pixel * 4) + 3] = 0
        }
      }

      if (clearRight) {
        for (let x = frameWidth - clearEdgeBand; x < frameWidth; x += 1) {
          const pixel = (y * frameWidth) + x
          data[(pixel * 4) + 0] = 0
          data[(pixel * 4) + 1] = 0
          data[(pixel * 4) + 2] = 0
          data[(pixel * 4) + 3] = 0
        }
      }
    }
  }

  cleanedFrames.push(
    await sharp(data, { raw: { width: frameWidth, height: frameHeight, channels: 4 } })
      .png()
      .toBuffer()
  )
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
  .composite(cleanedFrames.map((input, index) => ({ input, left: index * frameWidth, top: 0 })))
  .png()
  .toFile(destination)

console.log(destination)
