import { generateLetters } from '../data/letters.js'

// Manejo del avance de turnos: reposición de letras usadas,
// reducción de bloqueos y detección de fin de batalla.

// Después de una palabra válida se descarta el tablero completo. Se evita
// repetir exactamente la misma secuencia, aunque una letra sí puede volver
// a aparecer y puede haber duplicados dentro del nuevo tablero.
export function refreshLetterRack(state) {
  const previous = state.letters.map((tile) => tile.value).join('')
  let next

  do {
    next = generateLetters(state.letters.length)
  } while (next.map((tile) => tile.value).join('') === previous)

  state.letters = next
}

// Reduce la duración de los bloqueos al final de cada turno completo.
export function tickLetterStates(state) {
  for (const tile of state.letters) {
    if (tile.locked) {
      tile.lockTurns -= 1
      if (tile.lockTurns <= 0) {
        tile.locked = false
        tile.lockTurns = 0
      }
    }
  }
}

export function advanceTurn(state) {
  tickLetterStates(state)
  state.turn += 1
}

// Evalúa condiciones de fin. Devuelve true si la batalla terminó.
export function checkBattleEnd(state, events) {
  if (state.status !== 'playing') return true

  if (state.enemy.hp <= 0) {
    state.status = 'victory'
    events.push({ kind: 'end', text: `¡${state.enemy.name} fue derrotada! Victoria de Kael.` })
    return true
  }
  if (state.player.hp <= 0) {
    state.status = 'defeat'
    events.push({ kind: 'end', text: 'Kael cayó en combate...' })
    return true
  }
  if (state.timeLeft <= 0) {
    state.status = 'time_over'
    events.push({ kind: 'end', text: 'Se acabó el tiempo. Derrota.' })
    return true
  }
  return false
}
