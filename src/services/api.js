// Cliente del backend (Express + Prisma). En dev, VITE_API_URL queda
// vacía y Vite proxya /api hacia http://localhost:3001; en producción
// se define en .env.production (https://wordblade-api.chapstech.com).
// El juego funciona igual si el backend está apagado: los errores se
// registran y se sigue.

const API_ORIGIN = import.meta.env.VITE_API_URL ?? ''
const BASE_URL = `${API_ORIGIN}/api`
const FALLBACK_CHALLENGES = {
  8: ['AVENTURA', 'CABALLOS', 'DIAMANTE', 'ELEFANTE', 'FANTASMA'],
  10: ['AVENTURERO', 'BIBLIOTECA', 'DICCIONARIO', 'MISTERIOSO', 'NATURALEZA']
}

export async function saveBattleResult(result) {
  try {
    const res = await fetch(`${BASE_URL}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('No se pudo guardar el resultado en el backend:', err.message)
    return null
  }
}

export async function getRecentResults(limit = 10) {
  try {
    const res = await fetch(`${BASE_URL}/results?limit=${limit}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('No se pudieron cargar los resultados:', err.message)
    return []
  }
}

// Valida la ortografía de una palabra (el backend consulta LanguageTool).
// Devuelve { isCorrect, correctedWord, suggestions } o null si el backend no responde
// (en ese caso el juego valida solo con el diccionario local).
export async function checkWord(word, language = 'es') {
  try {
    const res = await fetch(`${BASE_URL}/words/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('No se pudo validar la ortografía:', err.message)
    return null
  }
}

export async function getWordChallenges(length = 8, difficulty = 3) {
  try {
    const params = new URLSearchParams({
      length: String(length),
      difficulty: String(difficulty)
    })
    const res = await fetch(`${BASE_URL}/words/challenge?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return Array.isArray(data.words) && data.words.length > 0
      ? data.words
      : (FALLBACK_CHALLENGES[length] ?? FALLBACK_CHALLENGES[8])
  } catch (err) {
    console.warn('No se pudieron cargar palabras secretas:', err.message)
    return FALLBACK_CHALLENGES[length] ?? FALLBACK_CHALLENGES[8]
  }
}

export async function getBestScore(scenarioId) {
  try {
    const res = await fetch(`${BASE_URL}/results/best?scenarioId=${encodeURIComponent(scenarioId)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('No se pudo cargar el mejor puntaje:', err.message)
    return null
  }
}
