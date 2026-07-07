import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { HEROES } from '../game/data/heroes.js'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [race, setRace] = useState('LOBO')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login({ name, accessCode, race })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo ingresar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page menu-page">
      <form className="menu-panel login-panel hero-login-panel" onSubmit={handleSubmit}>
        <img className="game-logo login-logo" src="/icons/icon-512.png" alt="Emblema de Wordblade" />
        <h1 className="game-title">
          Wordblade
          <span className="game-subtitle">Ingreso de Campeones</span>
        </h1>

        <div className="login-fields">
          <label className="field-label">
            Nombre
            <input
              className="text-field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre de sabio"
              autoComplete="nickname"
              maxLength={24}
              required
            />
          </label>

          <label className="field-label">
            Código secreto
            <input
              className="text-field"
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder="Código del clan"
              autoComplete="current-password"
              required
            />
          </label>
        </div>

        <section className="race-picker" aria-label="Campeón sabio">
          <h2>Elegí tu campeón sabio</h2>
          <div className="race-grid hero-grid">
            {HEROES.map((hero) => (
              <button
                className={`race-card hero-card ${race === hero.race ? 'selected' : ''}`}
                style={{ '--hero-accent': hero.accent }}
                type="button"
                key={hero.race}
                onClick={() => setRace(hero.race)}
                aria-pressed={race === hero.race}
              >
                <span className="hero-art-frame">
                  <img className="hero-art" src={hero.portrait} alt={hero.name} />
                </span>
                <span className="race-name hero-name">{hero.name}</span>
                <span className="hero-race">{hero.raceLabel}</span>
                <span className="hero-title">{hero.title}</span>
                <span className="race-desc">{hero.description}</span>
              </button>
            ))}
          </div>
        </section>

        {error ? <p className="login-error">{error}</p> : null}

        <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
          {submitting ? 'Abriendo portal…' : 'Entrar al juego'}
        </button>
      </form>
    </div>
  )
}
