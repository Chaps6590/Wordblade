import { ENEMIES } from '../data/enemies.js'
import { VOWELS } from '../data/letters.js'

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

export function enemyTurn(state, events, { lastWordLength = null } = {}) {
  const { enemy, player } = state
  const enemyDef = getEnemyDef(enemy.id)
  const phase = getActivePhase(enemyDef, enemy)

  // Anunciar cambio de fase del jefe
  if (enemyDef.phases && phase.phaseIndex !== enemy.phaseIndex) {
    enemy.phaseIndex = phase.phaseIndex
    events.push({ kind: 'phase', text: `⚠ ${enemy.name} entra en ${phase.phaseName}!` })
  }

  const abilities = phase.abilities

  // Jefe: se cura si el jugador usó una palabra de 3 letras
  if (abilities.healOnShortWords && lastWordLength === 3) {
    const healed = Math.min(abilities.healOnShortWords, enemy.maxHp - enemy.hp)
    if (healed > 0) {
      enemy.hp += healed
      events.push({ kind: 'enemyHeal', amount: healed, text: `${enemy.name} devora la palabra corta y recupera ${healed} HP.` })
    }
  }

  // Habilidades sobre letras cada N turnos
  const abilityTurn = abilities.blockEvery && state.turn % abilities.blockEvery === 0

  if (abilityTurn) {
    // Bloquear letras
    for (let i = 0; i < (abilities.blockCount ?? 0); i++) {
      const target = pickRandom(state.letters.filter((t) => !t.locked))
      if (!target) break
      target.locked = true
      target.lockTurns = abilities.blockDuration ?? 2
      events.push({ kind: 'letterBlocked', letterId: target.id, text: `${enemy.name} bloqueó la letra ${target.value}.` })
    }

    // Envenenar letras
    for (let i = 0; i < (abilities.poisonCount ?? 0); i++) {
      const target = pickRandom(state.letters.filter((t) => !t.poisoned && !t.locked))
      if (!target) break
      target.poisoned = true
      events.push({ kind: 'letterPoisoned', letterId: target.id, text: `${enemy.name} envenenó la letra ${target.value}.` })
    }

    // Maldecir una vocal (jefe fase 3)
    if (abilities.curseVowel) {
      const target = pickRandom(state.letters.filter((t) => VOWELS.includes(t.value) && !t.cursed))
      if (target) {
        target.cursed = true
        events.push({ kind: 'letterCursed', letterId: target.id, text: `${enemy.name} maldijo la vocal ${target.value}.` })
      }
    }
  }

  // Maldición aleatoria (chamán)
  if (abilities.curseChance && Math.random() < abilities.curseChance) {
    const target = pickRandom(state.letters.filter((t) => !t.cursed))
    if (target) {
      target.cursed = true
      events.push({ kind: 'letterCursed', letterId: target.id, text: `${enemy.name} maldijo la letra ${target.value}.` })
    }
  }

  // Ataque
  const damage = phase.attack
  const absorbed = Math.min(player.shield, damage)
  player.shield -= absorbed
  const dealt = damage - absorbed
  player.hp = Math.max(0, player.hp - dealt)

  let text = `${enemy.name} atacó e hizo ${dealt} de daño.`
  if (absorbed > 0) text += ` (El escudo absorbió ${absorbed}.)`
  events.push({ kind: 'enemyAttack', amount: dealt, absorbed, text })
}
