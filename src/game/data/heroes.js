const KAEL_IDLE_BASE_SEQUENCE = [0, 0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1]

export const HEROES = [
  {
    race: 'LOBO',
    raceLabel: 'Sabios Lobo',
    name: 'Kael Guardaluna',
    title: 'Guardián del acero azul',
    portrait: '/characters/heroes/kael-guardaluna.png',
    casualIdleAnimations: ['idleCasualGuard', 'idleCasualRead'],
    animations: {
      idle: {
        sheet: '/characters/heroes/kael-guardaluna/animations/idle-base.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 7,
        frameDurationMs: 140,
        frameSequence: KAEL_IDLE_BASE_SEQUENCE,
        repeat: -1
      },
      idleCasualGuard: {
        label: 'Idle casual guardia',
        sheet: '/characters/heroes/kael-guardaluna/animations/idle-casual-guard.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 6,
        repeat: -1,
        yoyo: true
      },
      idleCasualRead: {
        sheet: '/characters/heroes/kael-guardaluna/animations/idle-casual-read.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 6,
        repeat: -1,
        yoyo: true
      },
      attack: {
        label: 'Salto golpe',
        sheet: '/characters/heroes/kael-guardaluna/animations/attack-jump-strike.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 14,
        repeat: 0
      },
      hit: {
        label: 'Herido',
        sheet: '/characters/heroes/kael-guardaluna/animations/hit.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 12,
        repeat: 0
      },
      defeat: {
        label: 'Derrotado',
        sheet: '/characters/heroes/kael-guardaluna/animations/defeat.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 8,
        repeat: 0,
        holdLastFrame: true
      }
    },
    description: 'Defensa firme, mirada fría y golpes seguros.',
    accent: '#5cb2ff',
    artScale: 1.18,
    battleScale: 1
  },
  {
    race: 'TIGRE',
    raceLabel: 'Sabios Tigre',
    name: 'Rhygar',
    title: 'Duelista de la garra escarlata',
    portrait: '/characters/heroes/rhygar.png',
    animations: {
      idle: {
        label: 'Idle guardia',
        sheet: '/characters/heroes/rhygar/animations/idle-guard.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 7,
        repeat: -1,
        yoyo: true
      },
      attack: {
        label: 'Salto y ataque',
        sheet: '/characters/heroes/rhygar/animations/attack-leap-slash.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 14,
        repeat: 0
      },
      hit: {
        label: 'Herido',
        sheet: '/characters/heroes/rhygar/animations/hit.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 12,
        repeat: 0
      },
      defeat: {
        label: 'Derrotado',
        sheet: '/characters/heroes/rhygar/animations/defeat.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 8,
        repeat: 0,
        holdLastFrame: true
      },
      victory: {
        label: 'Victoria',
        sheet: '/characters/heroes/rhygar/animations/victory.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 9,
        repeat: -1,
        yoyo: true
      }
    },
    description: 'Ataques veloces, presión constante y furia precisa.',
    accent: '#ff6a35',
    artScale: 1.12,
    battleScale: 1.1
  },
  {
    race: 'AGUILA',
    raceLabel: 'Sabios Águila',
    name: 'Aeryn',
    title: 'Lancero del cielo rúnico',
    portrait: '/characters/heroes/aeryn.png',
    animations: {
      idle: {
        label: 'Idle base',
        sheet: '/characters/heroes/aeryn/animations/idle-base.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 7,
        repeat: -1,
        yoyo: true
      },
      idleCasual: {
        label: 'Idle casual',
        sheet: '/characters/heroes/aeryn/animations/idle-casual.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 7,
        repeat: -1,
        yoyo: true
      },
      attack: {
        label: 'Ataque vuelo',
        sheet: '/characters/heroes/aeryn/animations/attack-flight-lunge.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 14,
        repeat: 0
      },
      hit: {
        label: 'Herido',
        sheet: '/characters/heroes/aeryn/animations/hit.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 12,
        repeat: 0
      },
      defeat: {
        label: 'Derrota',
        sheet: '/characters/heroes/aeryn/animations/defeat.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 9,
        repeat: 0,
        holdLastFrame: true
      },
      victory: {
        label: 'Victoria',
        sheet: '/characters/heroes/aeryn/animations/victory.png',
        frameWidth: 512,
        frameHeight: 512,
        frames: 6,
        frameRate: 9,
        repeat: -1,
        yoyo: true
      }
    },
    description: 'Visión táctica, dominio del viento y alcance letal.',
    accent: '#d8a63e',
    artScale: 1.06,
    battleScale: 1.04
  }
]

export const HERO_BY_RACE = Object.fromEntries(HEROES.map((hero) => [hero.race, hero]))
