import { wordExists, normalizeWord } from '../data/dictionary-es.js'
import { checkWord } from '../../services/api.js'

// Valida una palabra contra el diccionario y las letras disponibles.
// Devuelve { valid, reason, word, usedTiles } donde usedTiles son las
// fichas concretas consumidas (cada ficha se usa una sola vez).
//
// Hay dos modos:
//  - validateWord: síncrona, solo diccionario local (fallback offline).
//  - validateWordHybrid: primero diccionario local; si la palabra no
//    está, consulta la ortografía en el backend (LanguageTool) para
//    distinguir "mal escrita" (con sugerencias) de "bien escrita pero
//    no aceptada en el juego".

export function validateWord(rawWord, tiles, playedWords) {
  const word = normalizeWord(rawWord)

  if (word.length < 2) {
    return invalid(word, 'La palabra es demasiado corta.')
  }

  if (playedWords.some((p) => p.word === word)) {
    return invalid(word, `Ya usaste la palabra ${word}.`)
  }

  const usedTiles = matchTiles(word, tiles)
  if (usedTiles === null) {
    return invalid(word, 'No tenés las letras necesarias (o están bloqueadas).')
  }

  if (!wordExists(word)) {
    return invalid(word, `"${word}" no existe en el diccionario.`)
  }

  return { valid: true, reason: null, word, usedTiles }
}

export async function validateWordHybrid(rawWord, tiles, playedWords, language = 'es') {
  const word = normalizeWord(rawWord)

  if (word.length < 2) {
    return invalid(word, 'La palabra es demasiado corta.')
  }

  if (playedWords.some((p) => p.word === word)) {
    return invalid(word, `Ya usaste la palabra ${word}.`)
  }

  const usedTiles = matchTiles(word, tiles)
  if (usedTiles === null) {
    return invalid(word, 'No tenés las letras necesarias (o están bloqueadas).')
  }

  // 1. Diccionario del juego: si está, se acepta directo
  if (wordExists(word)) {
    return { valid: true, reason: null, word, usedTiles }
  }

  // 2. Ortografía vía backend (LanguageTool)
  const spelling = await checkWord(word, language)

  if (!spelling) {
    // Sin backend o sin red: vale solo el diccionario local
    return invalid(word, `"${word}" no existe en el diccionario.`)
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

  return invalid(word, `"${word}" está bien escrita, pero no está en el diccionario del juego.`)
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
    const idx = available.findIndex((t) => t.value === char)
    if (idx === -1) return null
    used.push(available[idx])
    available.splice(idx, 1)
  }
  return used
}
