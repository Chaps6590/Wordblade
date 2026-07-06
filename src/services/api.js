// Cliente del backend (Express + Prisma). En dev, VITE_API_URL queda
// vacía y Vite proxya /api hacia http://localhost:3001; en producción
// se define en .env.production (https://wordblade-api.chapstech.com).
// El juego funciona igual si el backend está apagado: los errores se
// registran y se sigue.

const API_ORIGIN = import.meta.env.VITE_API_URL ?? ''
const BASE_URL = `${API_ORIGIN}/api`
const SESSION_KEY = 'wordblade-session'
export const UNAUTHORIZED_EVENT = 'wordblade:unauthorized'
const FALLBACK_CHALLENGES = {
  8: ['AVENTURA', 'CABALLOS', 'DIAMANTE', 'ELEFANTE', 'FANTASMA'],
  10: ['AVENTURERO', 'BIBLIOTECA', 'DICCIONARIO', 'MISTERIOSO', 'NATURALEZA']
}

export function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

async function authorizedFetch(url, options = {}) {
  const session = getSavedSession()
  const headers = new Headers(options.headers)
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)

  const response = await fetch(url, { ...options, headers })
  if (response.status === 401) {
    clearSession()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return response
}

export async function loginPlayer({ name, accessCode, race }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, accessCode, race })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `No se pudo ingresar (${res.status})`)
  saveSession(data)
  return data
}

export async function getCurrentPlayer() {
  const res = await authorizedFetch(`${BASE_URL}/auth/me`)
  if (!res.ok) return null
  return await res.json()
}

export async function logoutPlayer() {
  try {
    await authorizedFetch(`${BASE_URL}/auth/logout`, { method: 'POST' })
  } finally {
    clearSession()
  }
}

export async function saveBattleResult(result) {
  try {
    const res = await authorizedFetch(`${BASE_URL}/results`, {
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
    const res = await authorizedFetch(`${BASE_URL}/results?limit=${limit}`)
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
    const res = await authorizedFetch(`${BASE_URL}/words/check`, {
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
    const res = await authorizedFetch(`${BASE_URL}/words/challenge?${params}`)
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
    const res = await authorizedFetch(`${BASE_URL}/results/best?scenarioId=${encodeURIComponent(scenarioId)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('No se pudo cargar el mejor puntaje:', err.message)
    return null
  }
}
