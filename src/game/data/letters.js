// Datos de cada letra: puntos, efecto especial (si tiene) y frecuencia
// con la que aparece al generar letras aleatorias.

export const WILDCARD_VALUE = '★'

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
  Z: { points: 10, effect: 'lightning', effectName: 'Rayo',        effectDesc: '+15 daño mágico (ignora escudo)', frequency: 1 },
  [WILDCARD_VALUE]: { points: 0, effect: null, effectDesc: 'Comodín: elegí cualquier letra', frequency: 0 }
}

export const VOWELS = ['A', 'E', 'I', 'O', 'U']
const VOWEL_FREQUENCY_MULTIPLIER = 2
const RARE_LETTERS = ['B', 'F', 'G', 'H', 'J', 'Ñ', 'Q', 'V', 'X', 'Z']
const ACCENT_MAP = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U' }

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
    const multiplier = VOWELS.includes(value) ? VOWEL_FREQUENCY_MULTIPLIER : 1
    for (let i = 0; i < data.frequency * multiplier; i++) pool.push(value)
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

function shuffleTiles(tiles) {
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tiles[i], tiles[j]] = [tiles[j], tiles[i]]
  }
  return tiles
}

export function normalizeChallengeWord(word) {
  return String(word)
    .trim()
    .toLocaleUpperCase('es')
    .replace(/[ÁÉÍÓÚÜ]/g, (letter) => ACCENT_MAP[letter])
}

// Tablero especial: contiene todas las letras de una palabra secreta y
// cuatro extras. Dos extras son comodines y otra fuerza la aparición de
// letras menos frecuentes para que el tablero siga teniendo dificultad.
export function generateChallengeLetters(secretWord, extraCount = 4) {
  const targetLetters = [...normalizeChallengeWord(secretWord)]
  const extras = []
  const wildcardCount = Math.min(2, extraCount)

  for (let i = 0; i < wildcardCount; i++) extras.push(createTile(WILDCARD_VALUE))
  if (extras.length < extraCount) extras.push(createTile(randomFromPool(RARE_LETTERS)))
  while (extras.length < extraCount) extras.push(generateRandomTile())

  return shuffleTiles([
    ...targetLetters.map((letter) => createTile(letter)),
    ...extras
  ])
}

// Genera cada tablero desde cero. Todas las extracciones son independientes,
// por lo que pueden aparecer letras repetidas. Las vocales tienen doble peso
// y además se garantiza que al menos la mitad del tablero sean vocales.
export function generateLetters(count) {
  const minVowels = Math.ceil(count / 2)
  const tiles = Array.from({ length: count }, () => generateRandomTile())
  let vowelCount = tiles.filter((tile) => VOWELS.includes(tile.value)).length

  while (vowelCount < minVowels) {
    const consonantIndex = tiles.findIndex((tile) => !VOWELS.includes(tile.value))
    if (consonantIndex === -1) break
    tiles[consonantIndex] = generateRandomTile({ vowelOnly: true })
    vowelCount += 1
  }

  return shuffleTiles(tiles)
}
