import { LETTER_DATA } from '../data/letters.js'

// Aplica los efectos especiales de las letras usadas en una palabra.
// Muta el battleState (player/enemy) y devuelve la lista de efectos
// aplicados para el log y las animaciones.

export const EFFECT_VALUES = {
  heal: 4,           // HP por cada A
  shield: 3,         // escudo por cada O
  quick: 2,          // daño extra por cada S
  heavy: 4,          // daño contundente por cada M
  ancestral: 12,     // daño ancestral por cada Ñ (ignora escudo)
  lightning: 15,     // daño mágico por cada Z (ignora escudo)
  energyThreshold: 5,
  energyBurst: 10,   // daño extra al consumir 5 de energía
  poisonTileDamage: 3, // daño a Kael por usar una letra envenenada
  bleed: { damage: 2, turns: 3 },
  poison: { damage: 3, turns: 4 },
  burn: { damage: 2, turns: 3, attackPenalty: 2 }, // quemadura de la F
  defenseBroken: { damage: 0, turns: 2 } // la T anula la defensa enemiga
}

export function applyLetterEffects(state, usedTiles) {
  const effects = []
  const { player, enemy } = state
  let extraPhysical = 0
  let magicDamage = 0

  for (const tile of usedTiles) {
    const effect = LETTER_DATA[tile.value]?.effect
    if (!effect) continue

    switch (effect) {
      case 'heal': {
        const healed = Math.min(EFFECT_VALUES.heal, player.maxHp - player.hp)
        player.hp += healed
        effects.push({ type: 'heal', letter: tile.value, amount: healed, text: `La letra A curó ${healed} HP a ${player.name}.` })
        break
      }
      case 'shield': {
        player.shield += EFFECT_VALUES.shield
        effects.push({ type: 'shield', letter: tile.value, amount: EFFECT_VALUES.shield, text: `La letra O otorgó ${EFFECT_VALUES.shield} de escudo.` })
        break
      }
      case 'energy': {
        player.energy += 1
        effects.push({ type: 'energy', letter: tile.value, amount: 1, text: `La letra E cargó energía (${player.energy}/${EFFECT_VALUES.energyThreshold}).` })
        break
      }
      case 'quick': {
        extraPhysical += EFFECT_VALUES.quick
        effects.push({ type: 'quick', letter: tile.value, amount: EFFECT_VALUES.quick, text: `Ataque rápido de la S: +${EFFECT_VALUES.quick} de daño.` })
        break
      }
      case 'break': {
        const brokeSomething = enemy.shield > 0
        if (brokeSomething) {
          effects.push({ type: 'break', letter: tile.value, amount: enemy.shield, text: `La T rompió la defensa enemiga (${enemy.shield} de escudo destruido).` })
          enemy.shield = 0
        }
        // Además anula la defensa/armadura del enemigo por unos turnos
        addStatus(enemy, 'defenseBroken', EFFECT_VALUES.defenseBroken)
        if (!brokeSomething) {
          effects.push({ type: 'break', letter: tile.value, text: 'La T quebró la armadura enemiga por 2 turnos.' })
        }
        break
      }
      case 'heavy': {
        extraPhysical += EFFECT_VALUES.heavy
        effects.push({ type: 'heavy', letter: tile.value, amount: EFFECT_VALUES.heavy, text: `Golpe pesado de la M: +${EFFECT_VALUES.heavy} de daño.` })
        break
      }
      case 'burn': {
        addStatus(enemy, 'burn', EFFECT_VALUES.burn)
        effects.push({ type: 'burn', letter: tile.value, text: 'La F prendió fuego al enemigo (y reduce su ataque).' })
        break
      }
      case 'ancestral': {
        magicDamage += EFFECT_VALUES.ancestral
        effects.push({ type: 'ancestral', letter: tile.value, amount: EFFECT_VALUES.ancestral, text: `¡La Ñ desató un poder ancestral! +${EFFECT_VALUES.ancestral} de daño mágico.` })
        break
      }
      case 'bleed': {
        addStatus(enemy, 'bleed', EFFECT_VALUES.bleed)
        effects.push({ type: 'bleed', letter: tile.value, text: 'La R hizo sangrar al enemigo.' })
        break
      }
      case 'poison': {
        addStatus(enemy, 'poison', EFFECT_VALUES.poison)
        effects.push({ type: 'poison', letter: tile.value, text: 'La P envenenó al enemigo.' })
        break
      }
      case 'lightning': {
        magicDamage += EFFECT_VALUES.lightning
        effects.push({ type: 'lightning', letter: tile.value, amount: EFFECT_VALUES.lightning, text: `¡La Z invocó un rayo! +${EFFECT_VALUES.lightning} de daño mágico.` })
        break
      }
    }
  }

  // Descarga de energía acumulada
  if (player.energy >= EFFECT_VALUES.energyThreshold) {
    player.energy -= EFFECT_VALUES.energyThreshold
    extraPhysical += EFFECT_VALUES.energyBurst
    effects.push({ type: 'energyBurst', amount: EFFECT_VALUES.energyBurst, text: `¡Descarga de energía! +${EFFECT_VALUES.energyBurst} de daño.` })
  }

  // Costo por usar letras envenenadas
  const poisonedUsed = usedTiles.filter((t) => t.poisoned)
  for (const tile of poisonedUsed) {
    player.hp = Math.max(0, player.hp - EFFECT_VALUES.poisonTileDamage)
    effects.push({ type: 'selfPoison', letter: tile.value, amount: EFFECT_VALUES.poisonTileDamage, text: `La letra ${tile.value} estaba envenenada: ${player.name} sufre ${EFFECT_VALUES.poisonTileDamage} de daño.` })
  }

  return { effects, extraPhysical, magicDamage }
}

export function addStatus(target, type, { damage, turns }) {
  const existing = target.statuses.find((s) => s.type === type)
  if (existing) {
    existing.turns = Math.max(existing.turns, turns)
    existing.damage = Math.max(existing.damage, damage)
  } else {
    target.statuses.push({ type, damage, turns })
  }
}

export function hasStatus(target, type) {
  return target.statuses.some((s) => s.type === type)
}

// Aplica daño por estados (sangrado/veneno/quemadura) al inicio del turno
// enemigo. Los estados sin daño (aturdimiento, defensa rota) solo
// descuentan turnos. Devuelve los ticks con daño para el log.
export function tickStatuses(target) {
  const ticks = []
  for (const status of target.statuses) {
    if (status.damage > 0) {
      target.hp = Math.max(0, target.hp - status.damage)
      ticks.push({ type: status.type, amount: status.damage })
    }
    status.turns -= 1
  }
  target.statuses = target.statuses.filter((s) => s.turns > 0)
  return ticks
}
