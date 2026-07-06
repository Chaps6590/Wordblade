import { getScenario } from '../data/scenarios.js'
import { generateLetters } from '../data/letters.js'
import { validateWord } from './wordValidator.js'
import { calculateDamage } from './damageCalculator.js'
import { applyLetterEffects, tickStatuses } from './letterEffects.js'
import { enemyTurn, getEnemyDef } from './enemyAI.js'
import { replaceUsedTiles, advanceTurn, checkBattleEnd } from './turnManager.js'

// Motor principal de la batalla. Funciones puras sobre battleState:
// el estado entra, se procesa el turno completo y salen los eventos
// (para el log de React y las animaciones de Phaser).

export function createBattleState(scenarioId) {
  const scenario = getScenario(scenarioId)
  if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`)
  const enemyDef = getEnemyDef(scenario.enemyId)

  return {
    scenarioId,
    player: {
      name: 'Kael',
      hp: 100,
      maxHp: 100,
      shield: 0,
      energy: 0
    },
    enemy: {
      id: enemyDef.id,
      name: enemyDef.name,
      hp: enemyDef.maxHp,
      maxHp: enemyDef.maxHp,
      shield: 0,
      statuses: [],
      phaseIndex: 0
    },
    letters: generateLetters(scenario.letterCount),
    playedWords: [],
    turn: 1,
    timeLeft: scenario.time,
    score: 0,
    totalDamage: 0,
    battleLog: [{ text: `¡Comienza la batalla contra ${enemyDef.name}!`, kind: 'info' }],
    status: 'playing'
  }
}

// Procesa la palabra escrita por el jugador. Ejecuta el turno completo:
// ataque de Kael (o turno perdido) + respuesta del enemigo.
// Devuelve la lista de eventos del turno.
// Si el caller ya validó (p. ej. validateWordHybrid, que es asíncrona),
// puede pasar el resultado en `precomputedValidation`; si no, se valida
// acá en modo local/offline.
export function playWord(state, rawWord, precomputedValidation = null) {
  if (state.status !== 'playing') return []

  const events = []
  const result = precomputedValidation ?? validateWord(rawWord, state.letters, state.playedWords)
  let lastWordLength = null

  if (!result.valid) {
    events.push({ kind: 'invalid', text: `✗ ${result.reason} Kael pierde el turno.` })
  } else {
    lastWordLength = result.word.length
    attackWithWord(state, result, events)
  }

  // Fin por victoria antes de que el enemigo responda
  if (!checkBattleEnd(state, events)) {
    runEnemyPhase(state, events, lastWordLength)
    checkBattleEnd(state, events)
  }

  if (state.status === 'playing') {
    if (result.valid) replaceUsedTiles(state, result.usedTiles)
    advanceTurn(state)
  }

  appendLogs(state, events)
  return events
}

function attackWithWord(state, { word, usedTiles }, events) {
  const usableCount = state.letters.filter((t) => !t.locked).length
  const damage = calculateDamage(word, usedTiles, usableCount)
  const { effects, extraPhysical, magicDamage } = applyLetterEffects(state, usedTiles)

  // Daño físico: lo absorbe primero el escudo enemigo
  const physical = damage.total + extraPhysical
  const absorbed = Math.min(state.enemy.shield, physical)
  state.enemy.shield -= absorbed
  const physicalDealt = physical - absorbed

  // El daño mágico (rayo) ignora el escudo
  const totalDealt = physicalDealt + magicDamage
  state.enemy.hp = Math.max(0, state.enemy.hp - totalDealt)

  state.playedWords.push({ word, damage: totalDealt, points: damage.letterPoints })
  state.totalDamage += totalDealt
  state.score += damage.letterPoints + damage.lengthBonus + (damage.isCritical ? 10 : 0)

  let text = `Kael usó ${word} e hizo ${totalDealt} de daño.`
  if (damage.isCritical) text = `¡CRÍTICO! ${text} (usó todas las letras)`
  if (damage.cursedCount > 0) text += ` Las letras malditas redujeron el daño en ${damage.curseReduction}.`
  events.push({
    kind: 'playerAttack',
    amount: totalDealt,
    critical: damage.isCritical,
    magic: magicDamage > 0,
    word,
    text
  })

  for (const effect of effects) {
    events.push({ kind: 'effect', effect: effect.type, amount: effect.amount, text: effect.text })
  }
}

function runEnemyPhase(state, events, lastWordLength) {
  // Estados (sangrado / veneno) golpean al enemigo al inicio de su turno
  const ticks = tickStatuses(state.enemy)
  for (const tick of ticks) {
    const label = tick.type === 'bleed' ? 'sangrado' : 'veneno'
    events.push({ kind: 'statusTick', status: tick.type, amount: tick.amount, text: `${state.enemy.name} sufre ${tick.amount} de daño por ${label}.` })
  }

  if (checkBattleEnd(state, events)) return

  enemyTurn(state, events, { lastWordLength })
}

// El timer lo maneja la UI; acá solo se registra el paso del tiempo.
export function tickTime(state) {
  if (state.status !== 'playing') return []
  state.timeLeft = Math.max(0, state.timeLeft - 1)
  const events = []
  if (state.timeLeft === 0) {
    checkBattleEnd(state, events)
    appendLogs(state, events)
  }
  return events
}

function appendLogs(state, events) {
  for (const event of events) {
    if (event.text) {
      state.battleLog.push({ text: event.text, kind: event.kind })
    }
  }
  // Mantener el log acotado
  if (state.battleLog.length > 60) {
    state.battleLog = state.battleLog.slice(-60)
  }
}
