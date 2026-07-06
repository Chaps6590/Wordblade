import { wordExists, normalizeWord } from '../data/dictionary-es.js'
import { checkWord } from '../../services/api.js'

// Valida una palabra contra el diccionario y las letras disponibles.
// Devuelve { valid, reason, word, usedTiles } donde usedTiles son las
// fichas concretas consumidas (cada ficha se usa una sola vez).
//
// Hay dos modos:
//  - validateWord: síncrona, solo diccionario local (fallback offline).
//  - validateWordHybrid: consulta la ortografía completa en el backend
//    (LanguageTool). El diccionario local solo se usa si no hay conexión.

export function validateWord(rawWord, tiles, playedWords) {
  const word = normalizeWord(rawWord)

  if (word.length < 2) {
    return invalid(word, 'La palabra es demasiado corta.')
  }

  if (playedWords.some((p) => normalizeWord(p.word) === word)) {
    return invalid(word, `Ya usaste la palabra ${word}.`)
  }

  const usedTiles = matchTiles(word, tiles)
  if (usedTiles === null) {
    return invalid(word, 'No tenés las letras necesarias (o están bloqueadas).')
  }

  if (!wordExists(word)) {
    return invalid(word, `"${word}" no existe en el diccionario.`)
  }

  return { valid: true, reason: null, word: displayWord(rawWord), usedTiles }
}

export async function validateWordHybrid(rawWord, tiles, playedWords, language = 'es', trustedWords = []) {
  const word = normalizeWord(rawWord)

  if (word.length < 2) {
    return invalid(word, 'La palabra es demasiado corta.')
  }

  if (playedWords.some((p) => normalizeWord(p.word) === word)) {
    return invalid(word, `Ya usaste la palabra ${word}.`)
  }

  const usedTiles = matchTiles(word, tiles)
  if (usedTiles === null) {
    return invalid(word, 'No tenés las letras necesarias (o están bloqueadas).')
  }

  // Las palabras que armaron el tablero vienen de la API de desafíos y son
  // válidas aunque el corrector ortográfico no tenga una palabra muy rara.
  const trustedWord = trustedWords.find((candidate) => normalizeWord(candidate) === word)
  if (trustedWord) {
    return { valid: true, reason: null, word: displayWord(trustedWord), usedTiles }
  }

  // Ortografía vía backend (LanguageTool). Se consulta incluso cuando la
  // palabra está en el fallback local para poder restaurar sus tildes.
  const spelling = await checkWord(String(rawWord).trim(), language)

  if (!spelling) {
    if (wordExists(word)) {
      return { valid: true, reason: null, word: displayWord(rawWord), usedTiles }
    }
    return invalid(word, `No se pudo verificar "${word}" porque el validador no está disponible.`)
  }

  if (!spelling.isCorrect) {
    let reason = `"${word}" está mal escrita.`
    if (spelling.suggestions?.length > 0) {
      reason += ` ¿Quisiste decir: ${spelling.suggestions.join(', ')}?`
    }
    const result = invalid(word, reason)
    result.suggestions = spelling.suggestions ?? []
    return result
  }

  // LanguageTool la reconoce como correcta: se acepta aunque todavía
  // no forme parte del pequeño diccionario disponible sin conexión.
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
