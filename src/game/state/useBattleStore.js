import { create } from 'zustand'
import { createBattleState, playWord, tickTime } from '../core/battleEngine.js'
import { validateWordHybrid } from '../core/wordValidator.js'
import { eventBus } from '../phaser/eventBus.js'
import { getScenario } from '../data/scenarios.js'
import { getWordChallenges } from '../../services/api.js'

// Store global de la batalla. El motor (battleEngine) trabaja sobre un
// clon del estado y el store publica el resultado; los eventos de
// animación se reenvían a Phaser por el eventBus.

let startRequestId = 0

export const useBattleStore = create((set, get) => ({
  battle: null,
  validating: false, // true mientras se consulta la ortografía en el backend
  language: 'es',

  startBattle: async (scenarioId) => {
    const requestId = ++startRequestId
    const scenario = getScenario(scenarioId)
    if (!scenario) return

    set({ battle: null, validating: true })
    const challenges = await getWordChallenges(scenario.hiddenWordLength, scenario.wordDifficulty)
    if (requestId !== startRequestId) return
    set({ battle: createBattleState(scenarioId, challenges), validating: false })
  },

  submitWord: async (rawWord) => {
    const current = get().battle
    if (!current || current.status !== 'playing' || get().validating) return

    // Validación híbrida: diccionario local + ortografía (LanguageTool).
    // Si el backend no responde, validateWordHybrid cae al modo local.
    set({ validating: true })
    let validation = null
    try {
      validation = await validateWordHybrid(
        rawWord,
        current.letters,
        current.playedWords,
        get().language,
        current.challengeWords
      )
    } catch {
      validation = null // el motor valida en modo local
    }

    // La batalla pudo terminar mientras se validaba (p. ej. por tiempo)
    const latest = get().battle
    if (!latest || latest.status !== 'playing') {
      set({ validating: false })
      return
    }

    const draft = structuredClone(latest)
    const events = playWord(draft, rawWord, validation)
    set({ battle: draft, validating: false })

    for (const event of events) {
      eventBus.emit('battle-event', event)
    }
  },

  tick: () => {
    // La espera del validador depende de la red, no del jugador: mientras
    // la API responde, el reloj de la batalla queda completamente pausado.
    if (get().validating) return

    const current = get().battle
    if (!current || current.status !== 'playing') return

    const draft = structuredClone(current)
    const events = tickTime(draft)
    set({ battle: draft })

    for (const event of events) {
      eventBus.emit('battle-event', event)
    }
  },

  resetBattle: () => set({ battle: null, validating: false })
}))
