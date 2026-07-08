import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBattleStore } from '../game/state/useBattleStore.js'
import { getScenario } from '../game/data/scenarios.js'
import { saveBattleResult } from '../services/api.js'

const STATUS_INFO = {
  victory: { title: '¡VICTORIA!', className: 'result-victory' },
  defeat: { title: 'DERROTA', className: 'result-defeat' },
  time_over: { title: 'SE ACABÓ EL TIEMPO', className: 'result-defeat' }
}

export function ResultPage() {
  const navigate = useNavigate()
  const battle = useBattleStore((s) => s.battle)
  const savedRef = useRef(false)

  // Guardar el resultado en el backend (una sola vez, sin bloquear la UI)
  useEffect(() => {
    if (!battle || battle.status === 'playing' || savedRef.current) return
    savedRef.current = true
    saveBattleResult({
      scenarioId: battle.scenarioId,
      outcome: battle.status,
      score: battle.score,
      totalDamage: battle.totalDamage,
      turns: battle.turn,
      timeLeft: battle.timeLeft,
      words: battle.playedWords
    })
  }, [battle])

  if (!battle || battle.status === 'playing') {
    return (
      <div className="page result-page">
        <p>No hay resultados para mostrar.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Volver al menú</button>
      </div>
    )
  }

  const scenario = getScenario(battle.scenarioId)
  const info = STATUS_INFO[battle.status] ?? STATUS_INFO.defeat

  const longestWord = battle.playedWords.reduce(
    (best, played) => (played.word.length > (best?.word.length ?? 0) ? played : best),
    null
  )
  const minutes = Math.floor(battle.timeLeft / 60)
  const seconds = battle.timeLeft % 60
  const timeLeftLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="page result-page">
      <div className={`result-panel ${info.className}`}>
        <h2 className="result-title">{info.title}</h2>
        <p className="result-scenario">
          {scenario?.name}
          {battle.status === 'victory'
            ? ` — ${battle.enemy.name} derrotada`
            : ` — ${battle.enemy.name} venció a ${battle.player.name}`}
        </p>

        <div className="result-stats">
          <div className="stat">
            <span className="stat-value">{battle.score}</span>
            <span className="stat-label">Puntaje</span>
          </div>
          <div className="stat">
            <span className="stat-value">{battle.totalDamage}</span>
            <span className="stat-label">Daño total</span>
          </div>
          <div className="stat">
            <span className="stat-value">{battle.playedWords.length}</span>
            <span className="stat-label">Palabras</span>
          </div>
          <div className="stat">
            <span className="stat-value">{battle.turn}</span>
            <span className="stat-label">Turnos</span>
          </div>
          <div className="stat">
            <span className="stat-value">{timeLeftLabel}</span>
            <span className="stat-label">Tiempo restante</span>
          </div>
          <div className="stat">
            <span className="stat-value">{battle.invalidWords ?? 0}</span>
            <span className="stat-label">Inválidas</span>
          </div>
        </div>

        {longestWord && (
          <p className="result-longest">
            Palabra más larga: <strong>{longestWord.word}</strong> ({longestWord.word.length} letras, {longestWord.damage} de daño)
          </p>
        )}

        <div className="result-words">
          <h3>Palabras usadas</h3>
          {battle.playedWords.length === 0 ? (
            <p className="no-words">Ninguna palabra válida.</p>
          ) : (
            <ul>
              {battle.playedWords.map((played, i) => (
                <li key={i}>
                  <strong>{played.word}</strong> — {played.damage} de daño
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="result-buttons">
          <button className="btn btn-primary" onClick={() => navigate(`/battle/${battle.scenarioId}`)}>
            ↻ Reintentar
          </button>
          <button className="btn" onClick={() => navigate('/')}>
            ⌂ Volver al menú
          </button>
        </div>
      </div>
    </div>
  )
}
