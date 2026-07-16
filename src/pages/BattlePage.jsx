import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBattleStore } from '../game/state/useBattleStore.js'
import { getScenario } from '../game/data/scenarios.js'
import { PhaserGame } from '../game/phaser/PhaserGame.jsx'
import { WordInput } from '../components/WordInput.jsx'
import { TopHud } from '../components/TopHud.jsx'
import { BattleLog } from '../components/BattleLog.jsx'
import { SkillLegend } from '../components/SkillLegend.jsx'
import { BattleBoardPanel, CurrentWordDisplay } from '../components/BattleBoardPanel.jsx'
import { CollapsibleBattlePanel } from '../components/CollapsibleBattlePanel.jsx'
import { eventBus } from '../game/phaser/eventBus.js'
import { useAuth } from '../auth/useAuth.js'
import { buildLetterPower } from '../game/core/letterPowerColors.js'
import { HERO_BY_RACE } from '../game/data/heroes.js'

export function BattlePage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const { player } = useAuth()
  const scenario = getScenario(scenarioId)

  const battle = useBattleStore((s) => s.battle)
  const startBattle = useBattleStore((s) => s.startBattle)
  const submitWord = useBattleStore((s) => s.submitWord)
  const validating = useBattleStore((s) => s.validating)
  const pending = useBattleStore((s) => s.pending)
  const tick = useBattleStore((s) => s.tick)
  const punishClear = useBattleStore((s) => s.punishClear)

  const [word, setWord] = useState('')
  const [selectedTileIds, setSelectedTileIds] = useState([])

  // Iniciar batalla al entrar
  useEffect(() => {
    if (!scenario) {
      navigate('/')
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
      <div
        className="page battle-page battle-page--adventure"
        style={{ '--battle-bg': `url(${scenario?.backgroundImage ?? '/backgrounds/scenarios/forest-easy.png'})` }}
      >
        <div className="battle-background" aria-hidden="true" />
        <div className="battle-lighting" aria-hidden="true" />
        <BattleLoadingScreen
          scenario={scenario}
          heroRace={player?.race ?? 'LOBO'}
          message="Preparando duelo..."
          detail="Generando letras reales, cargando escenario y despertando animaciones."
        />
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
    const nextSelectedTileIds = [...selectedTileIds, tile.id]
    const selectedTiles = nextSelectedTileIds
      .map((id) => battle.letters.find((candidate) => candidate.id === id))
      .filter(Boolean)
    setWord((currentWord) => currentWord.length < 16 ? currentWord + tile.value : currentWord)
    setSelectedTileIds(nextSelectedTileIds)
    eventBus.emit('battle-event', { kind: 'playerAura', power: buildLetterPower(selectedTiles) })
  }

  const handleSubmit = (value) => {
    submitWord(value, selectedTileIds)
    setWord('')
    setSelectedTileIds([])
    eventBus.emit('battle-event', { kind: 'playerAura', power: null })
  }

  const handleClear = () => {
    if (!playing || validating || !word) return
    setWord('')
    setSelectedTileIds([])
    eventBus.emit('battle-event', { kind: 'playerAura', power: null })
    punishClear()
  }

  return (
    <div
      className="page battle-page battle-page--adventure"
      style={{ '--battle-bg': `url(${scenario.backgroundImage})` }}
    >
      <div className="battle-background" aria-hidden="true" />
      <div className="battle-lighting" aria-hidden="true" />

      <TopHud
        battle={battle}
        scenario={scenario}
        heroRace={player?.race ?? 'LOBO'}
        onExit={() => navigate('/')}
      />

      <div className="battle-stage">
        <PhaserGame
          scenarioId={scenarioId}
          heroRace={player?.race ?? 'LOBO'}
          loadingText="Cargando héroe, enemigo y escenario..."
        />
      </div>

      <CurrentWordDisplay
        battle={battle}
        word={word}
        selectedTileIds={selectedTileIds}
      />

      <section className="battle-bottom" aria-label="Interfaz de combate">
        <CollapsibleBattlePanel className="letter-skills-panel" title="Habilidades" defaultOpen>
          <SkillLegend />
        </CollapsibleBattlePanel>

        <section className="battle-board-panel" aria-label="Tablero y acciones">
          <div className="board-and-actions">
            <BattleBoardPanel
              battle={battle}
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
                disabled={!playing}
                busy={validating}
                showInput={false}
              />
            </section>
          </div>
        </section>

        <CollapsibleBattlePanel className="combat-log-panel" title="Historial" defaultOpen>
          <BattleLog entries={battle.battleLog} />
        </CollapsibleBattlePanel>
      </section>
    </div>
  )
}

function BattleLoadingScreen({ scenario, heroRace, message, detail }) {
  const hero = HERO_BY_RACE[heroRace] ?? HERO_BY_RACE.LOBO

  return (
    <section className="battle-loader battle-loader--full" role="status" aria-live="polite">
      <div className="battle-loader__crest">
        <img className="battle-loader__icon" src="/brand/wordblade-icon.png" alt="" aria-hidden="true" />
        <img className="battle-loader__wordmark" src="/brand/wordblade-text.png" alt="Wordblade" />
      </div>
      <div className="battle-loader__duel">
        <img src={hero.portrait} alt="" aria-hidden="true" />
        <div className="battle-loader__sigil" aria-hidden="true" />
      </div>
      <div className="battle-loader__copy">
        <strong>{message}</strong>
        <span>{scenario?.name ?? 'Aventura'}</span>
        <p>{detail}</p>
      </div>
      <div className="battle-loader__bar" aria-hidden="true"><span /></div>
    </section>
  )
}
