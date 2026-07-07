// Nivel inicial del juego. Primero pulimos una experiencia completa;
// después se pueden sumar más escenarios sobre la misma estructura.

export const INITIAL_SCENARIO_ID = 'forest_easy'

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
    mapPoint: 'Entrada del Bosque',
    description: 'Primer punto del mapa: entrás al bosque, derrotás a la garrapata, sobrevivís a la araña y enfrentás a la serpiente gigante.',
    encounters: [
      {
        enemyId: 'tick_explorer',
        label: 'Encuentro 1/3',
        intro: 'Una garrapata emerge entre las piedras del claro.'
      },
      {
        enemyId: 'forest_spider',
        label: 'Encuentro 2/3',
        intro: 'La maleza tiembla: una araña del bosque cae desde las ramas.'
      },
      {
        enemyId: 'giant_serpent',
        label: 'Jefe 3/3',
        intro: 'El suelo se abre. La serpiente gigante protege el final del bosque.'
      }
    ],
    backgroundImage: '/backgrounds/scenarios/forest-easy.png',
    background: { top: 0x1c3a26, bottom: 0x0e1f14 }
  }
]

export const INITIAL_SCENARIO = SCENARIOS[0]

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || null
}

export function getScenarioEncounter(scenario, encounterIndex = 0) {
  return scenario?.encounters?.[encounterIndex] ?? {
    enemyId: scenario?.enemyId,
    label: 'Encuentro',
    intro: null
  }
}
