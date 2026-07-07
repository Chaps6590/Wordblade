export const HEROES = [
  {
    race: 'LOBO',
    raceLabel: 'Sabios Lobo',
    name: 'Kael Guardaluna',
    title: 'Guardián del acero azul',
    portrait: '/characters/heroes/kael-guardaluna.png',
    description: 'Defensa firme, mirada fría y golpes seguros.',
    accent: '#5cb2ff'
  },
  {
    race: 'TIGRE',
    raceLabel: 'Sabios Tigre',
    name: 'Rakan Filo Rojo',
    title: 'Duelista de la garra escarlata',
    portrait: '/characters/heroes/rakan-filo-rojo.png',
    description: 'Ataques veloces, presión constante y furia precisa.',
    accent: '#ff6a35'
  },
  {
    race: 'AGUILA',
    raceLabel: 'Sabios Águila',
    name: 'Aelar Alacero',
    title: 'Lancero del cielo rúnico',
    portrait: '/characters/heroes/aelar-alacero.png',
    description: 'Visión táctica, dominio del viento y alcance letal.',
    accent: '#d8a63e'
  }
]

export const HERO_BY_RACE = Object.fromEntries(HEROES.map((hero) => [hero.race, hero]))
