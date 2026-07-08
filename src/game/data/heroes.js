export const HEROES = [
  {
    race: 'LOBO',
    raceLabel: 'Sabios Lobo',
    name: 'Kael Guardaluna',
    title: 'Guardián del acero azul',
    portrait: '/characters/heroes/kael-guardaluna.png',
    animations: {
      idle: {
        sheet: '/characters/heroes/kael-guardaluna/animations/idle-combat.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 7,
        repeat: -1,
        yoyo: true
      },
      idleSharpen: {
        sheet: '/characters/heroes/kael-guardaluna/animations/idle-sharpen.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 8,
        repeat: -1,
        yoyo: true
      },
      attack: {
        sheet: '/characters/heroes/kael-guardaluna/animations/attack-slash.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 14,
        repeat: 0
      },
      hit: {
        sheet: '/characters/heroes/kael-guardaluna/animations/hit.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 12,
        repeat: 0
      },
      defeat: {
        sheet: '/characters/heroes/kael-guardaluna/animations/defeat.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 9,
        repeat: 0,
        holdLastFrame: true
      }
    },
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
    animations: {
      idle: {
        sheet: '/characters/heroes/aelar-alacero/animations/idle-guard.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 7,
        repeat: -1,
        yoyo: true
      },
      idleWingReady: {
        sheet: '/characters/heroes/aelar-alacero/animations/idle-wing-ready.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 8,
        repeat: -1,
        yoyo: true
      },
      attack: {
        sheet: '/characters/heroes/aelar-alacero/animations/attack-lunge.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 14,
        repeat: 0
      },
      defeat: {
        sheet: '/characters/heroes/aelar-alacero/animations/defeat.png',
        frameWidth: 362,
        frameHeight: 512,
        frames: 6,
        frameRate: 9,
        repeat: 0,
        holdLastFrame: true
      }
    },
    description: 'Visión táctica, dominio del viento y alcance letal.',
    accent: '#d8a63e'
  }
]

export const HERO_BY_RACE = Object.fromEntries(HEROES.map((hero) => [hero.race, hero]))
