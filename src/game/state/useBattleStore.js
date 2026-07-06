import { create } from 'zustand'
import { createBattleState, playWord, tickTime } from '../core/battleEngine.js'
import { validateWordHybrid } from '../core/wordValidator.js'
import { eventBus } from '../phaser/eventBus.js'

// Store global de la batalla. El motor (battleEngine) trabaja sobre un
// clon del estado y el store publica el resultado; los eventos de
// animación se reenvían a Phaser por el eventBus.

export const useBattleStore = create((set, get) => ({
  battle: null,
  validating: false, // true mientras se consulta la ortografía en el backend
  language: 'es',

  startBattle: (scenarioId) => {
    set({ battle: createBattleState(scenarioId), validating: false })
  },

  submitWord: async (rawWord) => {
    const current = get().battle
    if (!current || current.status !== 'playing' || get().validating) return

    // Validación híbrida: diccionario local + ortografía (LanguageTool).
    // Si el backend no responde, validateWordHybrid cae al modo local.
    set({ validating: true })
    let validation = null
    try {
      validation = await validateWordHybrid(rawWord, current.letters, current.playedWords, get().language)
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
