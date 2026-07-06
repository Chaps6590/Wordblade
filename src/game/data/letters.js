// Datos de cada letra: puntos, efecto especial (si tiene) y frecuencia
// con la que aparece al generar letras aleatorias.

export const LETTER_DATA = {
  A: { points: 1, effect: 'heal',      effectName: 'Curación',     effectDesc: 'Cura 4 HP a Kael',            frequency: 12 },
  B: { points: 3, effect: null,        frequency: 2 },
  C: { points: 3, effect: null,        frequency: 4 },
  D: { points: 2, effect: null,        frequency: 5 },
  E: { points: 1, effect: 'energy',    effectName: 'Energía',      effectDesc: '+1 energía (a 5, +10 daño)',  frequency: 12 },
  F: { points: 4, effect: null,        frequency: 1 },
  G: { points: 2, effect: null,        frequency: 2 },
  H: { points: 4, effect: null,        frequency: 1 },
  I: { points: 1, effect: null,        frequency: 6 },
  J: { points: 8, effect: null,        frequency: 1 },
  L: { points: 1, effect: null,        frequency: 5 },
  M: { points: 3, effect: null,        frequency: 3 },
  N: { points: 1, effect: null,        frequency: 6 },
  Ñ: { points: 8, effect: null,        frequency: 1 },
  O: { points: 1, effect: 'shield',    effectName: 'Escudo',       effectDesc: '+3 de escudo a Kael',         frequency: 9 },
  P: { points: 3, effect: 'poison',    effectName: 'Veneno',       effectDesc: 'Envenena al enemigo (3 daño x 4 turnos)', frequency: 2 },
  Q: { points: 5, effect: null,        frequency: 1 },
  R: { points: 1, effect: 'bleed',     effectName: 'Sangrado',     effectDesc: 'El enemigo sangra (2 daño x 3 turnos)',   frequency: 6 },
  S: { points: 1, effect: 'quick',     effectName: 'Ataque rápido', effectDesc: '+2 de daño extra',           frequency: 7 },
  T: { points: 1, effect: 'break',     effectName: 'Rompe defensa', effectDesc: 'Destruye el escudo enemigo', frequency: 5 },
  U: { points: 1, effect: null,        frequency: 5 },
  V: { points: 4, effect: null,        frequency: 1 },
  X: { points: 8, effect: null,        frequency: 1 },
  Y: { points: 4, effect: null,        frequency: 1 },
  Z: { points: 10, effect: 'lightning', effectName: 'Rayo',        effectDesc: '+15 daño mágico (ignora escudo)', frequency: 1 }
}

export const VOWELS = ['A', 'E', 'I', 'O', 'U']

// Letras con habilidad, para la leyenda de la UI
export const SKILL_LETTERS = Object.entries(LETTER_DATA)
  .filter(([, data]) => data.effect)
  .map(([value, data]) => ({ value, ...data }))

let nextTileId = 0

function randomFromPool(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

function buildPool(filterFn) {
  const pool = []
  for (const [value, data] of Object.entries(LETTER_DATA)) {
    if (filterFn && !filterFn(value)) continue
    for (let i = 0; i < data.frequency; i++) pool.push(value)
  }
  return pool
}

export function createTile(value) {
  nextTileId += 1
  return {
    id: `l${nextTileId}`,
    value,
    locked: false,
    lockTurns: 0,
    poisoned: false,
    cursed: false
  }
}

export function generateRandomTile({ vowelOnly = false, consonantOnly = false } = {}) {
  let filter = null
  if (vowelOnly) filter = (v) => VOWELS.includes(v)
  if (consonantOnly) filter = (v) => !VOWELS.includes(v)
  return createTile(randomFromPool(buildPool(filter)))
}

// Genera el set inicial de letras garantizando un mínimo de vocales
// para que siempre sea posible formar palabras.
export function generateLetters(count) {
  const minVowels = count >= 9 ? 4 : 3
  const tiles = []
  for (let i = 0; i < minVowels; i++) tiles.push(generateRandomTile({ vowelOnly: true }))
  for (let i = minVowels; i < count; i++) tiles.push(generateRandomTile({ consonantOnly: true }))
  // Mezclar
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tiles[i], tiles[j]] = [tiles[j], tiles[i]]
  }
  return tiles
}
