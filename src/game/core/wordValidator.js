import { normalizeWord } from '../data/dictionary-es.js'
import { checkWord } from '../../services/api.js'

// Validación de palabras. Devuelve { valid, reason, word, usedTiles }
// donde usedTiles son las fichas concretas consumidas (cada ficha una vez).
//
// El juego valida SOLO por API (LanguageTool vía backend): sin diccionario
// local. Si la API no responde, la palabra no se acepta ni se rechaza:
// se devuelve { retryable: true } y el jugador NO pierde el turno.
//
// validateWord (síncrona) queda únicamente para tests del motor: chequea
// estructura y letras pero no consulta ortografía.

export const MIN_WORD_LENGTH = 3

// Chequeos que no necesitan red: longitud, repetida y letras disponibles.
function validateStructure(rawWord, tiles, playedWords, selectedTileIds = null) {
  const word = normalizeWord(rawWord)

  if (word.length < MIN_WORD_LENGTH) {
    return invalid(word, `La palabra debe tener al menos ${MIN_WORD_LENGTH} letras.`)
  }

  if (playedWords.some((p) => normalizeWord(p.word) === word)) {
    return invalid(word, `Ya usaste la palabra ${word}.`)
  }

  const usedTiles = selectedTileIds?.length
    ? matchSelectedTiles(word, tiles, selectedTileIds)
    : matchTiles(word, tiles)
  if (usedTiles === null) {
    return invalid(word, 'No tenés las letras necesarias (o están bloqueadas).')
  }

  return { valid: true, word, usedTiles }
}

// Solo para tests / motor sin red: NO valida existencia real.
export function validateWord(rawWord, tiles, playedWords) {
  const structure = validateStructure(rawWord, tiles, playedWords)
  if (!structure.valid) return structure
  return { valid: true, reason: null, word: displayWord(rawWord), usedTiles: structure.usedTiles }
}

export async function validateWordHybrid(rawWord, tiles, playedWords, language = 'es', trustedWords = [], selectedTileIds = null) {
  const structure = validateStructure(rawWord, tiles, playedWords, selectedTileIds)
  if (!structure.valid) return structure
  const { word, usedTiles } = structure

  // Las palabras que armaron el tablero vienen de la API de desafíos y son
  // válidas aunque el corrector ortográfico no tenga una palabra muy rara.
  const trustedWord = trustedWords.find((candidate) => normalizeWord(candidate) === word)
  if (trustedWord) {
    return { valid: true, reason: null, word: displayWord(trustedWord), usedTiles }
  }

  // Existencia y ortografía SIEMPRE por API (LanguageTool vía backend).
  const spelling = await checkWord(String(rawWord).trim(), language)

  if (!spelling) {
    // API caída: ni válida ni inválida. El jugador no pierde el turno.
    return {
      valid: false,
      retryable: true,
      reason: 'No se pudo validar la palabra. Intentá nuevamente.',
      word,
      usedTiles: []
    }
  }

  if (!spelling.isCorrect) {
    let reason = `"${word}" no existe o está mal escrita.`
    if (spelling.suggestions?.length > 0) {
      reason += ` ¿Quisiste decir: ${spelling.suggestions.join(', ')}?`
    }
    const result = invalid(word, reason)
    result.suggestions = spelling.suggestions ?? []
    return result
  }

  // LanguageTool la reconoce como correcta (y restaura tildes: CAMION -> CAMIÓN)
  return {
    valid: true,
    reason: null,
    word: spelling.correctedWord || displayWord(rawWord),
    usedTiles
  }
}

function displayWord(word) {
  return String(word).trim().toLocaleUpperCase('es')
}

function invalid(word, reason) {
  return { valid: false, reason, word, usedTiles: [] }
}

// Intenta asignar una ficha disponible (no bloqueada) a cada letra de la
// palabra. Devuelve las fichas usadas o null si no alcanza.
function matchTiles(word, tiles) {
  const available = tiles.filter((t) => !t.locked)
  const used = []

  for (const char of word) {
    const idx = available.findIndex((tile) => tile.value === char)
    if (idx === -1) return null
    used.push(available[idx])
    available.splice(idx, 1)
  }
  return used
}

function matchSelectedTiles(word, tiles, selectedTileIds) {
  if (selectedTileIds.length !== word.length) return null

  const used = []
  const usedIds = new Set()
  for (let index = 0; index < word.length; index++) {
    const tile = tiles.find((candidate) => candidate.id === selectedTileIds[index])
    if (!tile || tile.locked || usedIds.has(tile.id) || tile.value !== word[index]) return null
    used.push(tile)
    usedIds.add(tile.id)
  }
  return used
}
