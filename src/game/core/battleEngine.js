import { getScenario, getScenarioEncounter } from '../data/scenarios.js'
import { generateChallengeLetters, normalizeChallengeWord } from '../data/letters.js'
import { validateWord } from './wordValidator.js'
import { calculateDamage, attackTier } from './damageCalculator.js'
import { applyLetterEffects, tickStatuses, hasStatus } from './letterEffects.js'
import { enemyTurn, getEnemyDef, getActivePhase, applyWordReactions } from './enemyAI.js'
import { refreshLetterRack, advanceTurn, checkBattleEnd } from './turnManager.js'

// Motor principal de la batalla. Funciones puras sobre battleState:
// el estado entra, se procesa el turno completo y salen los eventos
// (para el log de React y las animaciones de Phaser).

const DEFAULT_CHALLENGES = {
  8: ['AVENTURA', 'CABALLOS', 'DIAMANTE', 'ELEFANTE', 'FANTASMA'],
  10: ['AVENTURERO', 'BIBLIOTECA', 'MISTERIOSO', 'NATURALEZA'],
  12: ['CONSTRUCCION', 'ARQUITECTURA', 'CIVILIZACION']
}
const HIDDEN_WORD_BONUS = 35
const STATUS_LABELS = { bleed: 'sangrado', poison: 'veneno', burn: 'quemadura' }

function pickChallenges(scenario, challengeWords) {
  const validChallenges = challengeWords
    .map((word) => String(word).trim().toLocaleUpperCase('es'))
    .filter((word) => normalizeChallengeWord(word).length === scenario.hiddenWordLength)
  return validChallenges.length > 0
    ? validChallenges
    : (DEFAULT_CHALLENGES[scenario.hiddenWordLength] ?? DEFAULT_CHALLENGES[8])
}

function generationStrategy(scenario) {
  if (scenario.supportWordLength) return `${scenario.hiddenWordLength}_plus_${scenario.supportWordLength}`
  return `${scenario.hiddenWordLength}_plus_extra`
}

export function createBattleState(scenarioId, challengeWords = [], playerProfile = {}) {
  const scenario = getScenario(scenarioId)
  if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`)
  const encounterIndex = 0
  const encounter = getScenarioEncounter(scenario, encounterIndex)
  const enemyDef = getEnemyDef(encounter.enemyId)
  const targets = pickChallenges(scenario, challengeWords)
  const hiddenWord = targets[0]
  const supportWord = scenario.supportWordLength ? targets[1 % targets.length] : null

  return {
    scenarioId,
    encounterIndex,
    encounterCount: scenario.encounters?.length ?? 1,
    encounterLabel: encounter.label,
    player: {
      name: playerProfile.name ?? 'Héroe',
      race: playerProfile.race ?? 'LOBO',
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
    letters: generateChallengeLetters(hiddenWord, {
      supportWord,
      totalCount: scenario.letterCount
    }),
    hiddenWord,
    supportWord,
    hiddenWordLength: scenario.hiddenWordLength,
    supportWordLength: scenario.supportWordLength,
    letterCount: scenario.letterCount,
    challengeWords: targets,
    challengeIndex: 0,
    generationStrategy: generationStrategy(scenario),
    playedWords: [],
    invalidWords: 0,
    turn: 1,
    timeLeft: scenario.time,
    score: 0,
    totalDamage: 0,
    battleLog: [
      { text: scenario.mapPoint ? `📍 ${scenario.mapPoint}` : scenario.name, kind: 'info' },
      { text: encounter.intro ?? `¡Comienza la batalla contra ${enemyDef.name}!`, kind: 'info' }
    ],
    status: 'playing'
  }
}

// Procesa la palabra escrita por el jugador. Ejecuta el turno completo:
// ataque del jugador (o turno perdido) + respuesta del enemigo.
// Devuelve la lista de eventos del turno.
// El store pasa la validación asíncrona (solo-API) en `precomputedValidation`;
// sin ella se usa la validación local (tests / modo offline de emergencia).
export function playWord(state, rawWord, precomputedValidation = null) {
  if (state.status !== 'playing') return []

  const events = []
  const result = precomputedValidation ?? validateWord(rawWord, state.letters, state.playedWords)

  // Falla de API: no se pierde el turno, no actúa el enemigo, no corre nada.
  if (result.retryable) {
    events.push({ kind: 'invalid', text: `⚠ ${result.reason}` })
    appendLogs(state, events)
    return events
  }

  let lastWordLength = null
  const wasInvalid = !result.valid

  if (wasInvalid) {
    state.invalidWords += 1
    events.push({ kind: 'invalid', text: `✗ ${result.reason} ${state.player.name} pierde el turno.` })
  } else {
    lastWordLength = result.word.length
    attackWithWord(state, result, events)
  }

  // Fin por victoria antes de que el enemigo responda
  if (!checkBattleEnd(state, events)) {
    // La palabra válida consume todo el tablero. El enemigo actúa luego
    // sobre las letras nuevas para que sus bloqueos/maldiciones persistan.
    if (result.valid) refreshLetterRack(state)
    runEnemyPhase(state, events, { lastWordLength, wasInvalid })
    checkBattleEnd(state, events)
  }

  if (state.status === 'playing') {
    advanceTurn(state)
  }

  appendLogs(state, events)
  return events
}

// Cambia toda la grilla por una nueva (ya generada con la API).
// La penalización se aplica recién acá, cuando la generación fue exitosa:
// el jugador pierde el turno y el enemigo responde.
export function swapLetterRack(state, newChallengeWords) {
  if (state.status !== 'playing') return []

  const scenario = getScenario(state.scenarioId)
  const events = []
  const targets = pickChallenges(scenario, newChallengeWords)

  state.challengeWords = targets
  state.challengeIndex = 0
  state.hiddenWord = targets[0]
  state.supportWord = state.supportWordLength ? targets[1 % targets.length] : null
  state.letters = generateChallengeLetters(state.hiddenWord, {
    supportWord: state.supportWord,
    totalCount: state.letterCount
  })

  events.push({ kind: 'info', text: `♻ ${state.player.name} invocó una grilla nueva de letras... y pierde el turno.` })

  if (!checkBattleEnd(state, events)) {
    runEnemyPhase(state, events, { lastWordLength: null, wasInvalid: false })
    checkBattleEnd(state, events)
  }

  if (state.status === 'playing') {
    advanceTurn(state)
  }

  appendLogs(state, events)
  return events
}

function attackWithWord(state, { word, usedTiles }, events) {
  const usableCount = state.letters.filter((t) => !t.locked).length
  const damage = calculateDamage(word, usedTiles, usableCount)
  const { effects, extraPhysical, magicDamage } = applyLetterEffects(state, usedTiles)
  const foundHiddenWord = normalizeChallengeWord(word) === normalizeChallengeWord(state.hiddenWord)
  const secretBonus = foundHiddenWord ? HIDDEN_WORD_BONUS : 0

  const enemyDef = getEnemyDef(state.enemy.id)
  const abilities = getActivePhase(enemyDef, state.enemy).abilities
  const tier = attackTier(word.length)

  let physical = damage.total + extraPhysical + secretBonus

  // Penalización del enemigo a palabras cortas (Escriba, Guardián, Chamán)
  let shortPenaltyApplied = false
  if (abilities.shortWordPenalty && word.length <= abilities.shortWordPenalty.maxLength) {
    physical = Math.max(1, Math.round(physical * abilities.shortWordPenalty.multiplier))
    shortPenaltyApplied = true
  }

  // Defensa/armadura del enemigo (Guardián). Se anula con la T
  // (defensa rota) o con palabras muy largas que la atraviesan.
  let defense = abilities.defense ?? 0
  if (defense > 0) {
    const pierced = abilities.pierceDefenseLength && word.length >= abilities.pierceDefenseLength
    if (pierced || hasStatus(state.enemy, 'defenseBroken')) defense = 0
  }
  const defended = Math.min(defense, physical)
  physical -= defended

  // Daño físico: lo absorbe primero el escudo enemigo
  const absorbed = Math.min(state.enemy.shield, physical)
  state.enemy.shield -= absorbed
  const physicalDealt = physical - absorbed

  // El daño mágico (rayo, ancestral) ignora escudo y defensa
  const totalDealt = physicalDealt + magicDamage
  state.enemy.hp = Math.max(0, state.enemy.hp - totalDealt)

  state.playedWords.push({ word, damage: totalDealt, points: damage.letterPoints })
  state.totalDamage += totalDealt
  state.score += damage.letterPoints + damage.lengthBonus + damage.tileBonusDamage + secretBonus + (damage.isCritical ? 10 : 0)

  let text = `${state.player.name} usó ${word} e hizo ${totalDealt} de daño.`
  if (tier === 'ultimate') text = `¡¡ATAQUE DEFINITIVO!! ${text}`
  else if (tier === 'special') text = `¡ATAQUE ESPECIAL! ${text}`
  if (foundHiddenWord) text = `¡PALABRA OCULTA DESCUBIERTA! +${secretBonus} de daño. ${text}`
  if (damage.tileBonusDamage > 0) text += ` Fichas de color: +${damage.tileBonusDamage}.`
  if (damage.isCritical) text = `¡CRÍTICO! ${text} (usó todas las letras)`
  if (damage.cursedCount > 0) text += ` Las letras malditas redujeron el daño en ${damage.curseReduction}.`
  if (shortPenaltyApplied) text += ` ${state.enemy.name} desprecia las palabras cortas: daño reducido.`
  if (defended > 0) text += ` La armadura absorbió ${defended}.`
  events.push({
    kind: 'playerAttack',
    amount: totalDealt,
    critical: damage.isCritical,
    magic: magicDamage > 0,
    secret: foundHiddenWord,
    tier,
    tileBonusDamage: damage.tileBonusDamage,
    word,
    text
  })

  for (const effect of effects) {
    events.push({ kind: 'effect', effect: effect.type, amount: effect.amount, text: effect.text })
  }
}

function runEnemyPhase(state, events, { lastWordLength, wasInvalid }) {
  // Reacciones a la palabra jugada (liberar letras, limpiar grilla, aturdir)
  const stunned = applyWordReactions(state, events, { lastWordLength })

  // Estados (sangrado / veneno / quemadura) golpean al enemigo
  const ticks = tickStatuses(state.enemy)
  for (const tick of ticks) {
    const label = STATUS_LABELS[tick.type] ?? tick.type
    events.push({ kind: 'statusTick', status: tick.type, amount: tick.amount, text: `${state.enemy.name} sufre ${tick.amount} de daño por ${label}.` })
  }

  if (checkBattleEnd(state, events)) return

  enemyTurn(state, events, { lastWordLength, wasInvalid, stunned })
}

// El timer lo maneja la UI; acá solo se registra el paso del tiempo.
export function tickTime(state) {
  if (state.status !== 'playing') return []
  state.timeLeft = Math.max(0, state.timeLeft - 1)
  const events = []
  if (state.timeLeft === 0) {
    attackPlayerOnTimeOver(state, events)
    appendLogs(state, events)
  }
  return events
}

function attackPlayerOnTimeOver(state, events) {
  const enemyDef = getEnemyDef(state.enemy.id)
  const phase = getActivePhase(enemyDef, state.enemy)
  const damage = state.player.shield + Math.max(1, state.player.hp, phase.attack)
  const absorbed = Math.min(state.player.shield, damage)
  const dealt = Math.max(0, Math.min(state.player.hp, damage - absorbed))

  state.player.shield = Math.max(0, state.player.shield - absorbed)
  state.player.hp = 0
  state.status = 'time_over'

  let text = `${state.enemy.name} aprovechó el final del tiempo y golpeó a ${state.player.name}.`
  if (absorbed > 0) text += ` El escudo absorbió ${absorbed}.`

  events.push({ kind: 'enemyAttack', amount: dealt, absorbed, finalBlow: true, text })
  events.push({ kind: 'end', result: 'time_over', afterEnemyAttack: true, text: 'Se acabó el tiempo. Derrota.' })
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
