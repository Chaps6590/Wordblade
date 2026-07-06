// Diccionario local simple para pruebas.
// Más adelante se puede reemplazar por una API o una base más grande
// sin tocar el resto del juego: solo hay que mantener wordExists().

const WORDS = [
  'AMOR',
  'MAR',
  'ROMA',
  'RAMO',
  'MORA',
  'MONTE',
  'MENTA',
  'TREN',
  'RETO',
  'ROSA',
  'CASA',
  'PERRO',
  'VALOR',
  'TORMENTA',
  'MAREA',
  'SOL',
  'LUZ',
  'FE',
  'VIDA',
  'LOBO',
  'ESPADA',
  'REINA',
  'BOSQUE',
  'FUEGO',
  'VENENO',
  'ESCUDO',
  'RAYO',
  'GUERRA',
  'FUERZA'
]

const DICTIONARY = new Set(WORDS)

const ACCENT_MAP = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U' }

export function normalizeWord(word) {
  return word
    .trim()
    .toUpperCase()
    .replace(/[ÁÉÍÓÚÜ]/g, (c) => ACCENT_MAP[c])
}

export function wordExists(word) {
  return DICTIONARY.has(normalizeWord(word))
}

export function getAllWords() {
  return [...WORDS]
}
