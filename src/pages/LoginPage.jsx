import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { HeroAnimatedArt } from '../components/HeroAnimatedArt.jsx'
import { PwaInstallButton } from '../components/PwaInstallButton.jsx'
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
    <div className="page menu-page login-screen-page">
      <div className="login-screen-bg" aria-hidden="true" />
      <div className="login-screen-shade" aria-hidden="true" />

      <div className="login-install-action">
        <PwaInstallButton />
      </div>

      <header className="login-brand">
        <img
          className="login-brand-icon"
          src="/brand/wordblade-icon.png"
          alt=""
          aria-hidden="true"
        />
        <img className="login-brand-text" src="/brand/wordblade-text.png" alt="Wordblade" />
      </header>

      <form className="login-screen-form" onSubmit={handleSubmit}>
        <div className="login-fields login-screen-fields">
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

        {error ? <p className="login-error">{error}</p> : null}

        <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
          {submitting ? 'Abriendo portal…' : 'Entrar al juego'}
        </button>

        <section className="race-picker login-hero-picker" aria-label="Campeón sabio">
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
                  <HeroAnimatedArt hero={hero} className="hero-art" alt={hero.name} />
                </span>
                <span className="race-name hero-name">{hero.name}</span>
                <span className="hero-race">{hero.raceLabel}</span>
                <span className="hero-title">{hero.title}</span>
                <span className="race-desc">{hero.description}</span>
              </button>
            ))}
          </div>
        </section>
      </form>
    </div>
  )
}
