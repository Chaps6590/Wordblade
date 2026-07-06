import { LETTER_DATA } from '../data/letters.js'

// Calcula el daño físico de una palabra:
// puntos por letra + bonus por longitud + crítico por usar todas las letras,
// reducido por letras malditas. Los efectos especiales (rayo, ataque rápido,
// energía) se suman aparte en letterEffects.js.

export const CURSE_MULTIPLIER = 0.7 // cada letra maldita usada multiplica el daño por 0.7

export function lengthBonus(length) {
  if (length >= 7) return 10
  if (length >= 5) return 5
  if (length === 4) return 2
  return 0
}

export function calculateDamage(word, usedTiles, totalUsableTiles) {
  const letterPoints = usedTiles.reduce(
    (sum, tile) => sum + (LETTER_DATA[tile.value]?.points ?? 1),
    0
  )

  const bonus = lengthBonus(word.length)

  // Crítico: usar TODAS las letras disponibles (no bloqueadas)
  const isCritical = usedTiles.length === totalUsableTiles && totalUsableTiles > 0

  let total = letterPoints + bonus
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
    isCritical,
    cursedCount,
    curseReduction: beforeCurse - total,
    total
  }
}
