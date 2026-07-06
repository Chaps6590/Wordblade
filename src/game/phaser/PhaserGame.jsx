import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { BattleScene } from './scenes/BattleScene.js'

// Monta el canvas de Phaser dentro de React.
// Phaser solo renderiza y anima: el estado vive en useBattleStore.

export function PhaserGame({ scenarioId }) {
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
      scene: [BootScene, BattleScene]
    })
    game.registry.set('scenarioId', scenarioId)
    gameRef.current = game

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [scenarioId])

  return <div ref={containerRef} className="phaser-container" />
}
