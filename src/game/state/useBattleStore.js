import { create } from 'zustand'
import { createBattleState, playWord, tickTime, swapLetterRack } from '../core/battleEngine.js'
import { validateWordHybrid } from '../core/wordValidator.js'
import { eventBus } from '../phaser/eventBus.js'
import { getScenario } from '../data/scenarios.js'
import { getWordChallenges, fetchWordChallengesStrict } from '../../services/api.js'

// Store global de la batalla. El motor (battleEngine) trabaja sobre un
// clon del estado y el store publica el resultado; los eventos de
// animación se reenvían a Phaser por el eventBus.
//
// `pending` marca las pausas técnicas por llamadas a APIs:
//   'loading_words'    generando/cambiando la grilla de letras
//   'validating_word'  validando la palabra jugada
// Mientras hay una pausa técnica el timer NO corre (ver tick()).

let startRequestId = 0

export const useBattleStore = create((set, get) => ({
  battle: null,
  pending: null, // null | 'loading_words' | 'validating_word'
  validating: false, // compat: true siempre que pending !== null
  language: 'es',

  startBattle: async (scenarioId) => {
    const requestId = ++startRequestId
    const scenario = getScenario(scenarioId)
    if (!scenario) return

    set({ battle: null, pending: 'loading_words', validating: true })
    const challenges = await getWordChallenges(scenario.hiddenWordLength, scenario.wordDifficulty)
    if (requestId !== startRequestId) return
    set({ battle: createBattleState(scenarioId, challenges), pending: null, validating: false })
  },

  submitWord: async (rawWord) => {
    const current = get().battle
    if (!current || current.status !== 'playing' || get().pending) return

    // Pausa técnica: el timer se detiene mientras la API valida.
    set({ pending: 'validating_word', validating: true })
    let validation
    try {
      validation = await validateWordHybrid(
        rawWord,
        current.letters,
        current.playedWords,
        get().language,
        current.challengeWords
      )
    } catch {
      // Error inesperado: se trata como falla de API (sin perder el turno)
      validation = {
        valid: false,
        retryable: true,
        reason: 'No se pudo validar la palabra. Intentá nuevamente.',
        word: rawWord,
        usedTiles: []
      }
    }

    // La batalla pudo terminar mientras se validaba
    const latest = get().battle
    if (!latest || latest.status !== 'playing') {
      set({ pending: null, validating: false })
      return
    }

    const draft = structuredClone(latest)
    const events = playWord(draft, rawWord, validation)
    set({ battle: draft, pending: null, validating: false })

    for (const event of events) {
      eventBus.emit('battle-event', event)
    }
  },

  // Cambia toda la grilla usando la API. La penalización (perder el turno)
  // se aplica solo si la generación fue exitosa; si la API falla no se
  // cambia nada, no ataca el enemigo y no corre el tiempo.
  swapLetters: async () => {
    const current = get().battle
    if (!current || current.status !== 'playing' || get().pending) return
    const scenario = getScenario(current.scenarioId)
    if (!scenario) return

    set({ pending: 'loading_words', validating: true })
    const words = await fetchWordChallengesStrict(scenario.hiddenWordLength, scenario.wordDifficulty)

    const latest = get().battle
    if (!latest || latest.status !== 'playing') {
      set({ pending: null, validating: false })
      return
    }

    const draft = structuredClone(latest)

    if (!words) {
      draft.battleLog.push({ text: '⚠ No se pudieron generar letras. Intentá nuevamente.', kind: 'invalid' })
      set({ battle: draft, pending: null, validating: false })
      return
    }

    const events = swapLetterRack(draft, words)
    set({ battle: draft, pending: null, validating: false })

    for (const event of events) {
      eventBus.emit('battle-event', event)
    }
  },

  tick: () => {
    // La espera de las APIs depende de la red, no del jugador: mientras
    // hay una pausa técnica el reloj de la batalla queda detenido.
    if (get().pending) return

    const current = get().battle
    if (!current || current.status !== 'playing') return

    const draft = structuredClone(current)
    const events = tickTime(draft)
    set({ battle: draft })

    for (const event of events) {
      eventBus.emit('battle-event', event)
    }
  },

  resetBattle: () => set({ battle: null, pending: null, validating: false })
}))
