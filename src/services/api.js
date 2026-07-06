// Cliente del backend (Express + Prisma). En dev, Vite proxya /api
// hacia http://localhost:3001. El juego funciona igual si el backend
// está apagado: los errores se registran y se sigue.

const BASE_URL = '/api'

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
// Devuelve { isCorrect, suggestions } o null si el backend no responde
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
