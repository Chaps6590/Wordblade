import { useNavigate } from 'react-router-dom'
import { SCENARIOS } from '../game/data/scenarios.js'
import { ENEMIES } from '../game/data/enemies.js'

const DIFFICULTY_CLASS = {
  'Fácil': 'diff-easy',
  'Media': 'diff-medium',
  'Alta': 'diff-hard'
}

export function ScenarioSelect() {
  const navigate = useNavigate()

  return (
    <div className="page scenarios-page">
      <h2 className="page-title">Elegí un escenario</h2>

      <div className="scenario-list">
        {SCENARIOS.map((scenario) => {
          const enemy = ENEMIES[scenario.enemyId]
          return (
            <article key={scenario.id} className="scenario-card">
              <header>
                <h3>{scenario.name}</h3>
                <span className={`difficulty ${DIFFICULTY_CLASS[scenario.difficulty] ?? ''}`}>
                  {scenario.difficulty}
                </span>
              </header>
              <p className="scenario-desc">{scenario.description}</p>
              <ul className="scenario-stats">
                <li>⏱ {scenario.time}s</li>
                <li>🔤 {scenario.letterCount} letras</li>
                <li>
                  {enemy.boss ? '👑' : '🐛'} {enemy.name} ({enemy.maxHp} HP)
                </li>
              </ul>
              <button className="btn btn-primary" onClick={() => navigate(`/battle/${scenario.id}`)}>
                Jugar
              </button>
            </article>
          )
        })}
      </div>

      <button className="btn btn-back" onClick={() => navigate('/')}>
        ← Volver al menú
      </button>
    </div>
  )
}
