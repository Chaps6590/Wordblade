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
    const container = containerRef.current

    if (gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
    }
    if (container) container.replaceChildren()

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
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
      if (container) container.replaceChildren()
      gameRef.current = null
    }
  }, [scenarioId, heroRace])

  return <div ref={containerRef} className="phaser-container" />
}
