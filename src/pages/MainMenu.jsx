import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { AppExitButton } from '../components/AppExitButton.jsx'
import { HeroAnimatedArt } from '../components/HeroAnimatedArt.jsx'
import { HERO_BY_RACE } from '../game/data/heroes.js'
import { INITIAL_SCENARIO_ID } from '../game/data/scenarios.js'
import { hardRefreshApp } from '../services/pwaInstall.js'

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0+dev'
const APP_COMMIT = import.meta.env.VITE_APP_COMMIT || 'sin-git'

export function MainMenu() {
  const navigate = useNavigate()
  const { player, logout } = useAuth()
  const hero = player ? HERO_BY_RACE[player.race] : null
  const displayName = player?.name || 'Kael'
  const [refreshing, setRefreshing] = useState(false)

  async function handleLogout() {
    await logout()
  }

  async function handleHardRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      await hardRefreshApp()
    } catch {
      setRefreshing(false)
    }
  }

  return (
    <div className="page menu-page main-menu-page main-menu">
      <div className="main-menu-bg" aria-hidden="true" />
      <div className="main-menu-shade" aria-hidden="true" />

      <header className="main-menu-top main-menu-header">
        <section className="home-player-hud" aria-label="Jugador">
          <div className="home-player-portrait">
            {hero ? <img src={hero.portrait} alt={hero.name} /> : null}
          </div>
          <div className="home-player-info">
            <span className="home-player-name">{displayName}</span>
            <span className="home-level-badge">Nivel {player?.level ?? 5}</span>
          </div>
        </section>

        <img className="home-wordblade-logo main-menu-logo" src="/brand/wordblade-text.png" alt="Wordblade" />

        <section className="home-resources" aria-label="Recursos">
          <span><b>◉</b> 12,450</span>
          <span><b>◆</b> 320</span>
          <button className="home-icon-btn" type="button" aria-label="Trofeos">🏆</button>
          <button className="home-icon-btn" type="button" aria-label="Mensajes">✉</button>
          <button className="home-icon-btn" type="button" aria-label="Opciones">⚙</button>
        </section>
      </header>

      <main className="main-menu-content">
        <section className="home-hero-stage main-menu-character" aria-label="Campeón activo">
          {hero ? <HeroAnimatedArt hero={hero} alt={hero.name} /> : null}
        </section>

        <section className="home-mode-zone" aria-label="Modos de juego">
          <div className="home-mode-cards menu-cards">
            <article
              className="mode-card menu-mode-card mode-card-adventure"
              onClick={() => navigate(`/battle/${INITIAL_SCENARIO_ID}`)}
            >
              <img className="mode-card-image" src="/menu/adventure-card.png" alt="" aria-hidden="true" />
              <div className="mode-card-overlay">
                <h2 className="mode-card-title">Aventura</h2>
                <p className="menu-mode-card__description">Explorá el reino y enfrentá enemigos.</p>
                <button className="btn mode-card-btn" type="button">
                  Entrar
                </button>
              </div>
            </article>

            <article
              className="mode-card menu-mode-card mode-card-multiplayer"
              onClick={() => navigate('/multiplayer')}
            >
              <img className="mode-card-image" src="/menu/multiplayer-mode-card.png" alt="" aria-hidden="true" />
              <div className="mode-card-overlay">
                <h2 className="mode-card-title">Multijugador</h2>
                <p className="menu-mode-card__description">Desafiá jugadores en duelos en tiempo real.</p>
                <button className="btn mode-card-btn mode-card-btn-red" type="button">
                  Ver salas
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="main-menu-bottom main-menu-footer">
        <div className="home-system-actions">
          <button className="btn btn-ghost" onClick={handleLogout}>
            Cerrar sesión
          </button>
          <AppExitButton />
        </div>

        <div className="menu-version-actions">
          <button
            className="btn btn-ghost menu-refresh-btn menu-frames-btn"
            type="button"
            onClick={() => navigate('/frames')}
          >
            Frames
          </button>
          <button
            className="btn btn-ghost menu-refresh-btn"
            type="button"
            onClick={handleHardRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <p className="menu-version" title={`Versión ${APP_VERSION}`}>
            commit {APP_COMMIT}
          </p>
        </div>
      </footer>
    </div>
  )
}
