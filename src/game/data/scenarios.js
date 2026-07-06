// Escenarios del juego. Cada uno define tiempo, cantidad de letras,
// enemigo y colores base para la escena Phaser.

export const SCENARIOS = [
  {
    id: 'forest_easy',
    name: 'Claro del Bosque',
    difficulty: 'Fácil',
    time: 90,
    letterCount: 16,
    hiddenWordLength: 8,
    supportWordLength: 8,
    wordDifficulty: 1,
    enemyId: 'tick_explorer',
    description: 'Un claro tranquilo... hasta que aparece una garrapata exploradora. Ideal para aprender a combatir con palabras.',
    background: { top: 0x1c3a26, bottom: 0x0e1f14 }
  },
  {
    id: 'forest_cursed',
    name: 'Bosque Maldito',
    difficulty: 'Media',
    time: 75,
    letterCount: 16,
    hiddenWordLength: 8,
    supportWordLength: 8,
    wordDifficulty: 3,
    enemyId: 'tick_shaman',
    description: 'La niebla violeta corrompe las palabras. La Garrapata Chamán bloquea y maldice tus letras.',
    background: { top: 0x2a1c3a, bottom: 0x140e1f }
  },
  {
    id: 'tick_temple',
    name: 'Templo de la Reina Garrapata',
    difficulty: 'Alta',
    time: 60,
    letterCount: 16,
    hiddenWordLength: 10,
    supportWordLength: null,
    wordDifficulty: 5,
    enemyId: 'tick_queen',
    description: 'El corazón del enjambre. La Reina cambia de fase al perder vida y castiga las palabras cortas.',
    background: { top: 0x3a1c1c, bottom: 0x1f0e0e }
  },
  {
    id: 'devourer_cave',
    name: 'Cueva del Devorador',
    difficulty: 'Alta',
    time: 80,
    letterCount: 16,
    hiddenWordLength: 8,
    supportWordLength: 8,
    wordDifficulty: 4,
    enemyId: 'letter_devourer',
    description: 'Una criatura que se alimenta de letras destruye tu grilla. Las palabras de 8+ letras lo aturden.',
    background: { top: 0x2b3a1c, bottom: 0x141f0e }
  },
  {
    id: 'cursed_library',
    name: 'Biblioteca Maldita',
    difficulty: 'Media',
    time: 75,
    letterCount: 16,
    hiddenWordLength: 8,
    supportWordLength: 8,
    wordDifficulty: 4,
    enemyId: 'cursed_scribe',
    description: 'El Escriba Maldito corrompe tus letras y contraataca doble si jugás una palabra inválida.',
    background: { top: 0x1c2440, bottom: 0x0d1226 }
  },
  {
    id: 'silence_web',
    name: 'Telaraña del Silencio',
    difficulty: 'Alta',
    time: 70,
    letterCount: 16,
    hiddenWordLength: 10,
    supportWordLength: null,
    wordDifficulty: 4,
    enemyId: 'silence_spider',
    description: 'La Araña bloquea vocales y silencia filas enteras. Solo las palabras largas liberan la grilla.',
    background: { top: 0x26263a, bottom: 0x111120 }
  },
  {
    id: 'codex_fortress',
    name: 'Fortaleza del Códice',
    difficulty: 'Alta',
    time: 80,
    letterCount: 16,
    hiddenWordLength: 10,
    supportWordLength: null,
    wordDifficulty: 5,
    enemyId: 'codex_guardian',
    description: 'El Guardián tiene armadura pesada. Palabras de 10+ letras la atraviesan; la T la rompe.',
    background: { top: 0x33333d, bottom: 0x17171f }
  },
  {
    id: 'plague_core',
    name: 'Núcleo de la Plaga Rúnica',
    difficulty: 'Muy alta',
    time: 90,
    letterCount: 16,
    hiddenWordLength: 12,
    supportWordLength: null,
    wordDifficulty: 5,
    enemyId: 'runic_plague',
    description: 'El jefe final: veneno, maldición y bloqueo a la vez. Las palabras de 12+ letras limpian toda la grilla.',
    background: { top: 0x3a1c3a, bottom: 0x1f0e1f }
  }
]

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || null
}
