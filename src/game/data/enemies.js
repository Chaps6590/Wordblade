// Definición de enemigos y sus habilidades.
// La IA (enemyAI.js) interpreta estos datos, acá no hay lógica.

export const ENEMIES = {
  tick_explorer: {
    id: 'tick_explorer',
    name: 'Garrapata Exploradora',
    maxHp: 60,
    attack: 5,
    color: 0x8a5a2b,
    abilities: {
      blockEvery: 4,      // bloquea letras cada N turnos
      blockCount: 1,
      blockDuration: 2
    }
  },

  tick_shaman: {
    id: 'tick_shaman',
    name: 'Garrapata Chamán',
    maxHp: 110,
    attack: 8,
    color: 0x5a2b8a,
    abilities: {
      blockEvery: 3,
      blockCount: 1,
      blockDuration: 2,
      curseChance: 0.4    // probabilidad de maldecir una letra en su turno
    }
  },

  tick_queen: {
    id: 'tick_queen',
    name: 'Reina Garrapata',
    maxHp: 200,
    attack: 12,
    color: 0x8a2b3a,
    boss: true,
    // Las fases se evalúan de la última a la primera según el % de vida.
    phases: [
      {
        name: 'Fase 1',
        hpAbove: 0.65,
        abilities: { blockEvery: 3, blockCount: 1, blockDuration: 2 }
      },
      {
        name: 'Fase 2',
        hpAbove: 0.3,
        abilities: { blockEvery: 3, blockCount: 2, blockDuration: 2, poisonCount: 1 }
      },
      {
        name: 'Fase 3',
        hpAbove: 0,
        abilities: {
          blockEvery: 3,
          blockCount: 2,
          blockDuration: 2,
          poisonCount: 1,
          curseVowel: true,
          attackBonus: 4,
          healOnShortWords: 10 // se cura si el jugador usa palabras de 3 letras
        }
      }
    ]
  }
}
