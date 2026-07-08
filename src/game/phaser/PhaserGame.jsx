import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { BattleScene } from './scenes/BattleScene.js'

// Monta el canvas de Phaser dentro de React.
// Phaser solo renderiza y anima: el estado vive en useBattleStore.

export function PhaserGame({ scenarioId, heroRace = 'LOBO' }) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 400,
      backgroundColor: '#050817',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      callbacks: {
        preBoot: (bootingGame) => {
          bootingGame.wordbladeScenarioId = scenarioId
          bootingGame.wordbladeHeroRace = heroRace
        }
      },
      scene: [BootScene, BattleScene]
    })
    gameRef.current = game

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [scenarioId, heroRace])

  return <div ref={containerRef} className="phaser-container" />
}
