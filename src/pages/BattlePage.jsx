import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBattleStore } from '../game/state/useBattleStore.js'
import { getScenario } from '../game/data/scenarios.js'
import { PhaserGame } from '../game/phaser/PhaserGame.jsx'
import { LetterTile } from '../components/LetterTile.jsx'
import { WordInput } from '../components/WordInput.jsx'
import { TimerBar } from '../components/TimerBar.jsx'
import { HealthBar } from '../components/HealthBar.jsx'
import { BattleLog } from '../components/BattleLog.jsx'
import { SkillLegend } from '../components/SkillLegend.jsx'
import { eventBus } from '../game/phaser/eventBus.js'

export function BattlePage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const scenario = getScenario(scenarioId)

  const battle = useBattleStore((s) => s.battle)
  const startBattle = useBattleStore((s) => s.startBattle)
  const submitWord = useBattleStore((s) => s.submitWord)
  const swapLetters = useBattleStore((s) => s.swapLetters)
  const validating = useBattleStore((s) => s.validating)
  const pending = useBattleStore((s) => s.pending)
  const tick = useBattleStore((s) => s.tick)

  const [word, setWord] = useState('')
  const [selectedTileIds, setSelectedTileIds] = useState([])

  // Iniciar batalla al entrar
  useEffect(() => {
    if (!scenario) {
      navigate('/scenarios')
      return
    }
    setWord('')
    setSelectedTileIds([])
    startBattle(scenarioId)
  }, [scenarioId, scenario, startBattle, navigate])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => tick(), 1000)
    return () => clearInterval(interval)
  }, [tick])

  // Al terminar la batalla, ir a resultados (con pausa para ver la animación)
  const status = battle?.status
  useEffect(() => {
    if (status && status !== 'playing') {
      const timeout = setTimeout(() => navigate('/result'), 2200)
      return () => clearTimeout(timeout)
    }
  }, [status, navigate])

  if (!battle || !scenario || battle.scenarioId !== scenarioId) {
    return (
      <div className="page battle-page">
        <div className="battle-background" aria-hidden="true" />
        <div className="battle-lighting" aria-hidden="true" />
        <p className="console-status">♻ Generando letras con palabras reales...</p>
      </div>
    )
  }

  const playing = battle.status === 'playing'
  const statusMessage =
    pending === 'validating_word' ? '⏳ Validando palabra... (el tiempo está pausado)' :
    pending === 'loading_words' ? '♻ Generando nuevas letras... (el tiempo está pausado)' :
    null

  const handleTileClick = (tile) => {
    if (!playing || validating || tile.locked || selectedTileIds.includes(tile.id)) return
    setWord((currentWord) => currentWord.length < 16 ? currentWord + tile.value : currentWord)
    setSelectedTileIds((currentIds) => [...currentIds, tile.id])
  }

  const handleSubmit = (value) => {
    submitWord(value)
    setWord('')
    setSelectedTileIds([])
  }

  const handleClear = () => {
    if (!playing || validating || !word) return
    setWord('')
    setSelectedTileIds([])
    eventBus.emit('battle-event', { kind: 'enemyLaugh' })
  }

  const handleSwap = () => {
    if (!playing || validating) return
    setWord('')
    setSelectedTileIds([])
    swapLetters()
  }

  return (
    <div
      className="page battle-page"
      style={{ '--battle-bg': `url(${scenario.backgroundImage})` }}
    >
      <div className="battle-background" aria-hidden="true" />
      <div className="battle-lighting" aria-hidden="true" />

      <header className="battle-header">
        <div className="battle-hud battle-hud-player">
          <HealthBar
            name={`${battle.player.name}  ${battle.player.energy > 0 ? `⚡${battle.player.energy}` : ''}`}
            hp={battle.player.hp}
            maxHp={battle.player.maxHp}
            shield={battle.player.shield}
            side="left"
          />
        </div>

        <div className="battle-timer-hud">
          <span className="scenario-name">
            {scenario.mapPoint ?? scenario.name}
            {battle.encounterLabel ? <small>{battle.encounterLabel}</small> : null}
          </span>
          <TimerBar timeLeft={battle.timeLeft} totalTime={scenario.time} />
          <span className="turn-counter">Turno {battle.turn}</span>
        </div>

        <div className="battle-hud battle-hud-enemy">
          <HealthBar
            name={battle.enemy.name}
            hp={battle.enemy.hp}
            maxHp={battle.enemy.maxHp}
            shield={battle.enemy.shield}
            side="right"
          />
        </div>
      </header>

      <div className="battle-stage">
        <PhaserGame scenarioId={scenarioId} />
        {word && (
          <div className="word-preview" aria-hidden="true">
            {word.split('').map((letter, i) => (
              <span key={i} className="word-preview-tile">{letter}</span>
            ))}
          </div>
        )}
      </div>

      <section className="battle-console">
        <section className="hidden-word-challenge" aria-label={`Palabra oculta de ${battle.hiddenWordLength} letras`}>
          <span>PALABRA OCULTA</span>
          <strong>{'◆'.repeat(battle.hiddenWordLength)}</strong>
          <small>Descubrila para sumar +35 de daño</small>
        </section>

        {statusMessage && <p className="console-status">{statusMessage}</p>}

        <section className="letters-row">
          {battle.letters.map((tile) => (
            <LetterTile
              key={tile.id}
              tile={tile}
              onClick={handleTileClick}
              selected={selectedTileIds.includes(tile.id)}
              disabled={!playing || validating}
            />
          ))}
        </section>
      </section>

      <section className="battle-actions" aria-label="Acciones de combate">
        <WordInput
          value={word}
          onChange={setWord}
          onSubmit={handleSubmit}
          onClear={handleClear}
          onSwap={handleSwap}
          disabled={!playing}
          busy={validating}
        />
      </section>

      <div className="battle-bottom">
        <BattleLog entries={battle.battleLog} />
        <SkillLegend />
      </div>

      <button className="btn btn-back" onClick={() => navigate('/scenarios')}>
        ← Abandonar batalla
      </button>

      <div className="portrait-blocker" role="status" aria-live="polite">
        <span className="rotate-icon" aria-hidden="true" />
        <strong>Girá tu dispositivo para jugar</strong>
      </div>
    </div>
  )
}
