import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { BattleScene } from './scenes/BattleScene.js'

// Monta el canvas de Phaser dentro de React.
// Phaser solo renderiza y anima: el estado vive en useBattleStore.

export function PhaserGame({ scenarioId, heroRace = 'LOBO', opponentHeroRace = 'LOBO', battleMode = 'adventure' }) {
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
      width: container?.clientWidth || 1200,
      height: container?.clientHeight || 400,
      // Lienzo transparente: el fondo del escenario lo pone el CSS de la
      // página (una sola imagen). Phaser solo dibuja personajes y efectos.
      transparent: true,
      scale: {
        // RESIZE: el lienzo ocupa TODO el contenedor, sin recuadro ni
        // barras negras (letterbox). La escena recalcula posiciones.
        mode: Phaser.Scale.RESIZE
      },
      callbacks: {
        preBoot: (bootingGame) => {
          bootingGame.wordbladeScenarioId = scenarioId
          bootingGame.wordbladeHeroRace = heroRace
          bootingGame.wordbladeOpponentHeroRace = opponentHeroRace
          bootingGame.wordbladeBattleMode = battleMode
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
  }, [scenarioId, heroRace, opponentHeroRace, battleMode])

  return <div ref={containerRef} className="phaser-container" />
}
