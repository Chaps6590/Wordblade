import { LETTER_DATA } from '../data/letters.js'

// Calcula el daño físico de una palabra:
// puntos por letra + bonus por longitud + crítico por usar todas las letras,
// reducido por letras malditas. Los efectos especiales (rayo, ataque rápido,
// energía) se suman aparte en letterEffects.js.

export const CURSE_MULTIPLIER = 0.7 // cada letra maldita usada multiplica el daño por 0.7

// Curva de bonus por longitud: las palabras largas deben sentirse
// muy poderosas. 10+ es "ataque especial" y 12+ "ataque definitivo".
export function lengthBonus(length) {
  if (length >= 12) return 50
  if (length >= 10) return 32
  if (length === 9) return 24
  if (length === 8) return 18
  if (length === 7) return 12
  if (length === 6) return 8
  if (length === 5) return 5
  if (length === 4) return 2
  return 0
}

// Categoría del ataque según la longitud (para logs y animaciones)
export function attackTier(length) {
  if (length >= 12) return 'ultimate'
  if (length >= 10) return 'special'
  return 'basic'
}

export function calculateDamage(word, usedTiles, totalUsableTiles) {
  const letterPoints = usedTiles.reduce(
    (sum, tile) => sum + (LETTER_DATA[tile.value]?.points ?? 1),
    0
  )

  const bonus = lengthBonus(word.length)
  const tileBonusDamage = usedTiles.reduce((sum, tile) => sum + (tile.bonusDamage ?? 0), 0)

  // Crítico: usar TODAS las letras disponibles (no bloqueadas)
  const isCritical = usedTiles.length === totalUsableTiles && totalUsableTiles > 0

  let total = letterPoints + bonus + tileBonusDamage
  if (isCritical) total = Math.round(total * 1.5)

  const cursedCount = usedTiles.filter((t) => t.cursed).length
  const beforeCurse = total
  for (let i = 0; i < cursedCount; i++) {
    total = total * CURSE_MULTIPLIER
  }
  total = Math.max(1, Math.round(total))

  return {
    letterPoints,
    lengthBonus: bonus,
    tileBonusDamage,
    isCritical,
    cursedCount,
    curseReduction: beforeCurse - total,
    total
  }
}
