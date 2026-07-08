import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBattleStore } from '../game/state/useBattleStore.js'
import { getScenario } from '../game/data/scenarios.js'
import { PhaserGame } from '../game/phaser/PhaserGame.jsx'
import { WordInput } from '../components/WordInput.jsx'
import { TopHud } from '../components/TopHud.jsx'
import { BattleLog } from '../components/BattleLog.jsx'
import { SkillLegend } from '../components/SkillLegend.jsx'
import { BattleBoardPanel } from '../components/BattleBoardPanel.jsx'
import { CollapsibleBattlePanel } from '../components/CollapsibleBattlePanel.jsx'
import { eventBus } from '../game/phaser/eventBus.js'
import { useAuth } from '../auth/useAuth.js'

export function BattlePage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const { player } = useAuth()
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
    startBattle(scenarioId, { name: player?.name, race: player?.race })
  }, [scenarioId, scenario, startBattle, navigate, player?.name, player?.race])

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

      <TopHud battle={battle} scenario={scenario} heroRace={player?.race ?? 'LOBO'} />

      <div className="battle-stage">
        <PhaserGame scenarioId={scenarioId} heroRace={player?.race ?? 'LOBO'} />
      </div>

      <BattleBoardPanel
        battle={battle}
        word={word}
        statusMessage={statusMessage}
        selectedTileIds={selectedTileIds}
        onTileClick={handleTileClick}
        playing={playing}
        validating={validating}
      />

      <section className="battle-actions" aria-label="Acciones de combate">
        <WordInput
          value={word}
          onChange={setWord}
          onSubmit={handleSubmit}
          onClear={handleClear}
          onSwap={handleSwap}
          disabled={!playing}
          busy={validating}
          showInput={false}
        />
      </section>

      <CollapsibleBattlePanel className="letter-skills-panel" title="Habilidades de letras">
        <SkillLegend />
      </CollapsibleBattlePanel>

      <CollapsibleBattlePanel className="combat-log-panel" title="Historial">
        <BattleLog entries={battle.battleLog} />
      </CollapsibleBattlePanel>

      <button className="btn btn-back" onClick={() => navigate('/scenarios')}>
        ← Abandonar batalla
      </button>
    </div>
  )
}
