import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

const RACES = [
  { value: 'LOBO', label: 'Sabios Lobo', icon: '🐺', description: 'Instinto, resistencia y colmillos de luna.' },
  { value: 'TIGRE', label: 'Sabios Tigre', icon: '🐯', description: 'Furia, precisión y golpes veloces.' },
  { value: 'AGUILA', label: 'Sabios Águila', icon: '🦅', description: 'Visión, estrategia y viento alto.' }
]

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
      <form className="menu-panel login-panel" onSubmit={handleSubmit}>
        <img className="game-logo login-logo" src="/icons/icon-512.png" alt="Emblema de Wordblade" />
        <h1 className="game-title">
          Wordblade
          <span className="game-subtitle">Ingreso de Sabios</span>
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

        <section className="race-picker" aria-label="Raza de sabios">
          <h2>Elegí tu raza de sabios</h2>
          <div className="race-grid">
            {RACES.map((option) => (
              <button
                className={`race-card ${race === option.value ? 'selected' : ''}`}
                type="button"
                key={option.value}
                onClick={() => setRace(option.value)}
              >
                <span className="race-icon">{option.icon}</span>
                <span className="race-name">{option.label}</span>
                <span className="race-desc">{option.description}</span>
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
