import { LETTER_DATA } from '../data/letters.js'

const EFFECT_POWER_COLORS = {
  heal: 'green',
  shield: 'green',
  energy: 'yellow',
  quick: 'yellow',
  burn: 'red',
  poison: 'red',
  bleed: 'red',
  lightning: 'red',
  heavy: 'red',
  break: 'red',
  ancestral: 'red'
}

const POWER_COLOR_HEX = {
  green: '#47d78a',
  yellow: '#ffd150',
  red: '#ff6270',
  blue: '#5cb2ff',
  violet: '#c58bff',
  gold: '#ffd166'
}

const POWER_COLOR_MIXES = {
  'green+red': '#ffd150',
  'red+yellow': '#ff9a3c',
  'green+yellow': '#b9ff54',
  'green+red+yellow': '#9ffcff'
}

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`
}

function averageColors(colors) {
  const mixed = colors.reduce(
    (sum, color) => {
      const rgb = hexToRgb(POWER_COLOR_HEX[color] ?? POWER_COLOR_HEX.yellow)
      return { r: sum.r + rgb.r, g: sum.g + rgb.g, b: sum.b + rgb.b }
    },
    { r: 0, g: 0, b: 0 }
  )

  return rgbToHex({
    r: mixed.r / colors.length + 22,
    g: mixed.g / colors.length + 22,
    b: mixed.b / colors.length + 22
  })
}

export function getTilePowerColor(tile) {
  if (!tile) return null
  const effect = tile.effect ?? LETTER_DATA[tile.value]?.effect
  return EFFECT_POWER_COLORS[effect] ?? tile.bonusColor ?? null
}

export function buildLetterPower(tiles) {
  const colors = tiles.map(getTilePowerColor).filter(Boolean)
  if (colors.length === 0) return null

  const uniqueColors = [...new Set(colors)]
  const primaryColors = uniqueColors.filter((color) => ['green', 'red', 'yellow'].includes(color))
  const mixKey = primaryColors.sort().join('+')
  const hex = primaryColors.length >= 2
    ? POWER_COLOR_MIXES[mixKey] ?? averageColors(primaryColors)
    : uniqueColors.length >= 2
      ? averageColors(uniqueColors)
      : (POWER_COLOR_HEX[uniqueColors[0]] ?? averageColors(uniqueColors))

  const tier = Math.min(3, Math.max(1, uniqueColors.length))
  const charge = Math.min(5, colors.length)

  return {
    colors: uniqueColors,
    hex,
    tier,
    charge,
    auraScale: 1 + (tier - 1) * 0.22 + Math.max(0, charge - 1) * 0.05
  }
}
