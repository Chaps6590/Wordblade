import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { BattleScene } from './scenes/BattleScene.js'

// Monta el canvas de Phaser dentro de React.
// Phaser solo renderiza y anima: el estado vive en useBattleStore.

export function PhaserGame({ scenarioId, heroRace = 'LOBO', opponentHeroRace = 'LOBO', battleMode = 'adventure', loadingText = 'Forjando arena...' }) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    setReady(false)

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
          bootingGame.wordbladeOnReady = () => setReady(true)
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

  return (
    <div className={`phaser-shell ${ready ? 'is-ready' : 'is-loading'}`}>
      <div ref={containerRef} className="phaser-container" />
      {!ready && (
        <div className="battle-loader battle-loader--canvas" role="status" aria-live="polite">
          <div className="battle-loader__sigil" aria-hidden="true" />
          <p>{loadingText}</p>
          <div className="battle-loader__bar" aria-hidden="true"><span /></div>
        </div>
      )}
    </div>
  )
}
