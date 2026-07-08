// Definición de enemigos y sus habilidades.
// La IA (enemyAI.js) interpreta estos datos, acá no hay lógica.
//
// Habilidades disponibles (todas opcionales):
//   blockEvery / blockCount / blockDuration  bloquea letras cada N turnos
//   blockTargets: 'vowel' | 'consonant'      qué letras prefiere bloquear
//   curseChance / curseVowelChance           maldice letras al azar
//   curseVowel: true                         maldice una vocal en turno de habilidad
//   poisonCount                              envenena letras en turno de habilidad
//   devourEvery                              devora (inutiliza) una letra cada N turnos
//   blockRepeatedChance                      bloquea todas las letras repetidas 1 turno
//   invertChance                             invierte una letra (inutilizable 1 turno)
//   silenceRowChance                         silencia una fila completa 1 turno
//   gainShieldEvery / shieldGain             gana escudo cada N turnos
//   defense                                  reduce el daño físico recibido
//   pierceDefenseLength                      palabras de N+ letras ignoran su defensa
//   shortWordPenalty: { maxLength, multiplier }  reduce daño de palabras cortas
//   healOnShortWords                         se cura si el jugador usa palabras de 3 letras
//   stunOnWordLength                         queda aturdido con palabras de N+ letras
//   restoreVowelOnLength                     palabras de N+ letras liberan una vocal bloqueada
//   clearBlocksOnLength                      palabras de N+ letras rompen todos los bloqueos
//   cleanGridOnLength                        palabras de N+ letras limpian toda la grilla
//   counterOnInvalid                         multiplica su ataque si la palabra fue inválida
//   poisonPlayerOnInvalid                    daña a Kael si la palabra fue inválida
//   attackBonus                              suma ataque (fases)

export const ENEMIES = {
  tick_explorer: {
    id: 'tick_explorer',
    name: 'Garrapata Exploradora',
    maxHp: 60,
    attack: 5,
    color: 0x8a5a2b,
    spriteKind: 'tick',
    spriteImage: '/characters/enemies/garrapata-exploradora.png',
    spriteScale: { maxWidth: 160, maxHeight: 139, offsetY: 8 },
    abilities: {
      blockEvery: 4,
      blockCount: 1,
      blockDuration: 1
    }
  },

  forest_spider: {
    id: 'forest_spider',
    name: 'Araña del Bosque',
    maxHp: 105,
    attack: 8,
    color: 0x3a3a4a,
    spriteKind: 'spider',
    spriteImage: '/characters/enemies/arana-del-bosque.png',
    spriteScale: { maxWidth: 176, maxHeight: 151, offsetY: 8 },
    abilities: {
      blockEvery: 3,
      blockCount: 1,
      blockDuration: 2,
      poisonCount: 1,
      restoreVowelOnLength: 6
    }
  },

  giant_serpent: {
    id: 'giant_serpent',
    name: 'Serpiente Gigante',
    maxHp: 175,
    attack: 11,
    color: 0x2f7a45,
    boss: true,
    spriteKind: 'serpent',
    spriteImage: '/characters/enemies/serpiente-gigante.png',
    spriteScale: { maxWidth: 191, maxHeight: 195, offsetY: -18 },
    abilities: {
      poisonCount: 1,
      curseVowelChance: 0.25,
      shortWordPenalty: { maxLength: 4, multiplier: 0.7 },
      stunOnWordLength: 9
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
      curseChance: 0.3,
      curseVowelChance: 0.2,
      shortWordPenalty: { maxLength: 4, multiplier: 0.7 }
    }
  },

  tick_queen: {
    id: 'tick_queen',
    name: 'Reina Garrapata',
    maxHp: 200,
    attack: 12,
    color: 0x8a2b3a,
    boss: true,
    // Las fases se evalúan de la primera a la última según el % de vida.
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
          healOnShortWords: 10
        }
      }
    ]
  },

  // --- Jefes nuevos ---

  letter_devourer: {
    id: 'letter_devourer',
    name: 'El Devorador de Letras',
    maxHp: 230,
    attack: 10,
    color: 0x3f6a2b,
    boss: true,
    // Se alimenta de la grilla: hay que frenarlo con palabras largas.
    abilities: {
      devourEvery: 3,
      blockRepeatedChance: 0.25,
      blockDuration: 1,
      stunOnWordLength: 8
    }
  },

  cursed_scribe: {
    id: 'cursed_scribe',
    name: 'El Escriba Maldito',
    maxHp: 180,
    attack: 9,
    color: 0x2b3a6a,
    boss: true,
    // Corrompe palabras y castiga errores: contraataca doble ante inválidas.
    abilities: {
      curseChance: 0.35,
      invertChance: 0.3,
      blockDuration: 1,
      counterOnInvalid: 2,
      shortWordPenalty: { maxLength: 4, multiplier: 0.6 }
    }
  },

  silence_spider: {
    id: 'silence_spider',
    name: 'La Araña del Silencio',
    maxHp: 210,
    attack: 11,
    color: 0x3a3a4a,
    boss: true,
    // Bloquea vocales y filas: las palabras largas liberan la grilla.
    abilities: {
      blockEvery: 2,
      blockCount: 1,
      blockDuration: 2,
      blockTargets: 'vowel',
      silenceRowChance: 0.25,
      restoreVowelOnLength: 5,
      clearBlocksOnLength: 8
    }
  },

  codex_guardian: {
    id: 'codex_guardian',
    name: 'El Guardián del Códice',
    maxHp: 250,
    attack: 13,
    color: 0x6a6a7a,
    boss: true,
    // Tanque con armadura: palabras cortas rebotan, las de 10+ la atraviesan.
    // La letra T (rompe defensa) es clave contra él.
    abilities: {
      defense: 6,
      gainShieldEvery: 3,
      shieldGain: 6,
      shortWordPenalty: { maxLength: 5, multiplier: 0.5 },
      pierceDefenseLength: 10
    }
  },

  runic_plague: {
    id: 'runic_plague',
    name: 'La Plaga Rúnica',
    maxHp: 280,
    attack: 14,
    color: 0x5a2b5a,
    boss: true,
    // Jefe final: mezcla veneno, maldición y bloqueo. Prueba todo lo aprendido.
    phases: [
      {
        name: 'Fase 1',
        hpAbove: 0.66,
        abilities: {
          blockEvery: 3,
          blockCount: 1,
          blockDuration: 2,
          blockTargets: 'consonant',
          poisonCount: 2,
          cleanGridOnLength: 12
        }
      },
      {
        name: 'Fase 2',
        hpAbove: 0.33,
        abilities: {
          blockEvery: 3,
          blockCount: 1,
          blockDuration: 2,
          blockTargets: 'consonant',
          poisonCount: 2,
          curseVowel: true,
          healOnShortWords: 12,
          cleanGridOnLength: 12
        }
      },
      {
        name: 'Fase 3: FURIA',
        hpAbove: 0,
        abilities: {
          blockEvery: 3,
          blockCount: 1,
          blockDuration: 2,
          blockTargets: 'consonant',
          poisonCount: 2,
          curseVowel: true,
          attackBonus: 5,
          poisonPlayerOnInvalid: 5,
          cleanGridOnLength: 12
        }
      }
    ]
  }
}
