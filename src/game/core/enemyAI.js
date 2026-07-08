import { ENEMIES } from '../data/enemies.js'
import { VOWELS } from '../data/letters.js'
import { hasStatus, EFFECT_VALUES } from './letterEffects.js'

// IA del enemigo: decide y ejecuta su turno según los datos de enemies.js.
// Muta el battleState y agrega eventos (log + animaciones) a `events`.

export function getEnemyDef(enemyId) {
  return ENEMIES[enemyId]
}

// Devuelve las habilidades activas y el ataque actual (con fases de jefe).
export function getActivePhase(enemyDef, enemy) {
  if (!enemyDef.phases) {
    return { abilities: enemyDef.abilities, attack: enemyDef.attack, phaseIndex: 0, phaseName: null }
  }
  const ratio = enemy.hp / enemy.maxHp
  let phaseIndex = enemyDef.phases.findIndex((p) => ratio > p.hpAbove)
  if (phaseIndex === -1) phaseIndex = enemyDef.phases.length - 1
  const phase = enemyDef.phases[phaseIndex]
  return {
    abilities: phase.abilities,
    attack: enemyDef.attack + (phase.abilities.attackBonus ?? 0),
    phaseIndex,
    phaseName: phase.name
  }
}

function pickRandom(list) {
  if (list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)]
}

function usableTiles(state) {
  return state.letters.filter((t) => !t.locked && !t.devoured)
}

function blockTile(tile, duration) {
  tile.locked = true
  tile.lockTurns = duration
}

// Reacciones del enemigo a la palabra que acaba de jugar Kael
// (se ejecutan ANTES de su turno; algunas se lo anulan).
// Devuelve true si el enemigo queda aturdido y pierde el turno.
export function applyWordReactions(state, events, { lastWordLength = null } = {}) {
  if (!lastWordLength) return false

  const { enemy } = state
  const enemyDef = getEnemyDef(enemy.id)
  const abilities = getActivePhase(enemyDef, enemy).abilities

  // Araña: una palabra de 5+ letras libera una vocal bloqueada
  if (abilities.restoreVowelOnLength && lastWordLength >= abilities.restoreVowelOnLength) {
    const target = pickRandom(state.letters.filter((t) => t.locked && !t.devoured && VOWELS.includes(t.value)))
    if (target) {
      target.locked = false
      target.lockTurns = 0
      events.push({ kind: 'effect', effect: 'unlock', text: `La palabra liberó la vocal ${target.value} del silencio.` })
    }
  }

  // Araña: 8+ letras rompe todos los bloqueos
  if (abilities.clearBlocksOnLength && lastWordLength >= abilities.clearBlocksOnLength) {
    let freed = 0
    for (const tile of state.letters) {
      if (tile.locked && !tile.devoured) {
        tile.locked = false
        tile.lockTurns = 0
        freed++
      }
    }
    if (freed > 0) {
      events.push({ kind: 'effect', effect: 'unlock', text: `¡El grito de ${state.player.name} rompió todos los silencios! (${freed} letras liberadas)` })
    }
  }

  // Plaga: 12+ letras limpia toda la grilla
  if (abilities.cleanGridOnLength && lastWordLength >= abilities.cleanGridOnLength) {
    for (const tile of state.letters) {
      tile.locked = false
      tile.lockTurns = 0
      tile.poisoned = false
      tile.cursed = false
      tile.devoured = false
    }
    events.push({ kind: 'effect', effect: 'unlock', text: '¡PALABRA LEGENDARIA! Toda la grilla quedó purificada.' })
  }

  // Devorador: una palabra de 8+ letras lo aturde
  if (abilities.stunOnWordLength && lastWordLength >= abilities.stunOnWordLength) {
    events.push({ kind: 'effect', effect: 'stun', text: `¡${enemy.name} quedó ATURDIDO por la palabra de ${lastWordLength} letras y pierde su turno!` })
    return true
  }

  return false
}

export function enemyTurn(state, events, { lastWordLength = null, wasInvalid = false, stunned = false } = {}) {
  const { enemy, player } = state
  const enemyDef = getEnemyDef(enemy.id)
  const phase = getActivePhase(enemyDef, enemy)

  // Anunciar cambio de fase del jefe
  if (enemyDef.phases && phase.phaseIndex !== enemy.phaseIndex) {
    enemy.phaseIndex = phase.phaseIndex
    events.push({ kind: 'phase', text: `⚠ ${enemy.name} entra en ${phase.phaseName}!` })
  }

  if (stunned) return

  const abilities = phase.abilities

  // Jefe: se cura si el jugador usó una palabra de 3 letras
  if (abilities.healOnShortWords && lastWordLength === 3) {
    const healed = Math.min(abilities.healOnShortWords, enemy.maxHp - enemy.hp)
    if (healed > 0) {
      enemy.hp += healed
      events.push({ kind: 'enemyHeal', amount: healed, text: `${enemy.name} devora la palabra corta y recupera ${healed} HP.` })
    }
  }

  // Plaga fase 3: las palabras inválidas envenenan al jugador
  if (abilities.poisonPlayerOnInvalid && wasInvalid) {
    player.hp = Math.max(0, player.hp - abilities.poisonPlayerOnInvalid)
    events.push({ kind: 'enemyAttack', amount: abilities.poisonPlayerOnInvalid, text: `El error de ${player.name} lo envenena: sufre ${abilities.poisonPlayerOnInvalid} de daño.` })
  }

  // Guardián: gana escudo cada N turnos
  if (abilities.gainShieldEvery && state.turn % abilities.gainShieldEvery === 0) {
    const gain = abilities.shieldGain ?? 5
    enemy.shield += gain
    events.push({ kind: 'enemyShield', amount: gain, text: `${enemy.name} refuerza su armadura (+${gain} de escudo).` })
  }

  // Devorador: consume una letra de la grilla cada N turnos
  if (abilities.devourEvery && state.turn % abilities.devourEvery === 0) {
    const target = pickRandom(usableTiles(state))
    if (target) {
      target.devoured = true
      target.locked = true
      target.lockTurns = 99
      events.push({ kind: 'letterBlocked', letterId: target.id, text: `${enemy.name} DEVORÓ la letra ${target.value}. Ya no puede usarse.` })
    }
  }

  // Devorador: bloquea todas las letras repetidas durante 1 turno
  if (abilities.blockRepeatedChance && Math.random() < abilities.blockRepeatedChance) {
    const counts = {}
    for (const tile of usableTiles(state)) counts[tile.value] = (counts[tile.value] ?? 0) + 1
    const repeated = usableTiles(state).filter((t) => counts[t.value] > 1)
    if (repeated.length > 0) {
      for (const tile of repeated) blockTile(tile, 1)
      events.push({ kind: 'letterBlocked', text: `${enemy.name} selló todas las letras repetidas por 1 turno (${repeated.length} letras).` })
    }
  }

  // Escriba: invierte una letra y la vuelve inutilizable por 1 turno
  if (abilities.invertChance && Math.random() < abilities.invertChance) {
    const target = pickRandom(usableTiles(state))
    if (target) {
      blockTile(target, 1)
      events.push({ kind: 'letterBlocked', letterId: target.id, text: `${enemy.name} invirtió la letra ${target.value}: inutilizable por 1 turno.` })
    }
  }

  // Araña: silencia una fila completa de la grilla durante 1 turno
  if (abilities.silenceRowChance && Math.random() < abilities.silenceRowChance) {
    const rowCount = Math.floor(state.letters.length / 4)
    const row = Math.floor(Math.random() * rowCount)
    const rowTiles = state.letters.slice(row * 4, row * 4 + 4).filter((t) => !t.locked && !t.devoured)
    if (rowTiles.length > 0) {
      for (const tile of rowTiles) blockTile(tile, 1)
      events.push({ kind: 'letterBlocked', text: `${enemy.name} silenció la fila ${row + 1} completa por 1 turno.` })
    }
  }

  // Habilidades sobre letras cada N turnos
  const abilityTurn = abilities.blockEvery && state.turn % abilities.blockEvery === 0

  if (abilityTurn) {
    // Bloquear letras (con preferencia por vocales/consonantes si la tiene)
    for (let i = 0; i < (abilities.blockCount ?? 0); i++) {
      let pool = usableTiles(state)
      if (abilities.blockTargets === 'vowel') {
        const vowels = pool.filter((t) => VOWELS.includes(t.value))
        if (vowels.length > 0) pool = vowels
      } else if (abilities.blockTargets === 'consonant') {
        const consonants = pool.filter((t) => !VOWELS.includes(t.value))
        if (consonants.length > 0) pool = consonants
      }
      const target = pickRandom(pool)
      if (!target) break
      blockTile(target, abilities.blockDuration ?? 2)
      events.push({ kind: 'letterBlocked', letterId: target.id, text: `${enemy.name} bloqueó la letra ${target.value}.` })
    }

    // Envenenar letras
    for (let i = 0; i < (abilities.poisonCount ?? 0); i++) {
      const target = pickRandom(usableTiles(state).filter((t) => !t.poisoned))
      if (!target) break
      target.poisoned = true
      events.push({ kind: 'letterPoisoned', letterId: target.id, text: `${enemy.name} envenenó la letra ${target.value}.` })
    }

    // Maldecir una vocal (jefes)
    if (abilities.curseVowel) {
      const target = pickRandom(state.letters.filter((t) => VOWELS.includes(t.value) && !t.cursed && !t.devoured))
      if (target) {
        target.cursed = true
        events.push({ kind: 'letterCursed', letterId: target.id, text: `${enemy.name} maldijo la vocal ${target.value}.` })
      }
    }
  }

  // Maldición aleatoria de cualquier letra
  if (abilities.curseChance && Math.random() < abilities.curseChance) {
    const target = pickRandom(state.letters.filter((t) => !t.cursed && !t.devoured))
    if (target) {
      target.cursed = true
      events.push({ kind: 'letterCursed', letterId: target.id, text: `${enemy.name} maldijo la letra ${target.value}.` })
    }
  }

  // Maldición aleatoria de una vocal (chamán)
  if (abilities.curseVowelChance && Math.random() < abilities.curseVowelChance) {
    const target = pickRandom(state.letters.filter((t) => VOWELS.includes(t.value) && !t.cursed && !t.devoured))
    if (target) {
      target.cursed = true
      events.push({ kind: 'letterCursed', letterId: target.id, text: `${enemy.name} maldijo la vocal ${target.value}.` })
    }
  }

  // --- Ataque ---
  let damage = phase.attack

  // Escriba: contraataca con daño multiplicado ante una palabra inválida
  if (abilities.counterOnInvalid && wasInvalid) {
    damage *= abilities.counterOnInvalid
    events.push({ kind: 'phase', text: `${enemy.name} castiga el error con un CONTRAATAQUE x${abilities.counterOnInvalid}.` })
  }

  // La quemadura reduce el ataque enemigo
  if (hasStatus(enemy, 'burn')) {
    damage = Math.max(1, damage - EFFECT_VALUES.burn.attackPenalty)
  }

  const absorbed = Math.min(player.shield, damage)
  player.shield -= absorbed
  const dealt = damage - absorbed
  player.hp = Math.max(0, player.hp - dealt)

  let text = `${enemy.name} atacó e hizo ${dealt} de daño.`
  if (absorbed > 0) text += ` (El escudo absorbió ${absorbed}.)`
  events.push({ kind: 'enemyAttack', amount: dealt, absorbed, text })
}
