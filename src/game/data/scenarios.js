// Escenarios del juego. Cada uno define tiempo, cantidad de letras,
// enemigo y colores base para la escena Phaser.

export const SCENARIOS = [
  {
    id: 'forest_easy',
    name: 'Claro del Bosque',
    difficulty: 'Fácil',
    time: 90,
    letterCount: 12,
    hiddenWordLength: 8,
    extraLetterCount: 4,
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
    letterCount: 12,
    hiddenWordLength: 8,
    extraLetterCount: 4,
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
    letterCount: 12,
    hiddenWordLength: 8,
    extraLetterCount: 4,
    wordDifficulty: 5,
    enemyId: 'tick_queen',
    description: 'El corazón del enjambre. La Reina cambia de fase al perder vida y castiga las palabras cortas.',
    background: { top: 0x3a1c1c, bottom: 0x1f0e0e }
  }
]

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || null
}
