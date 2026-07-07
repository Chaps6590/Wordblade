import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { AppExitButton } from '../components/AppExitButton.jsx'
import { PwaInstallButton } from '../components/PwaInstallButton.jsx'
import { HERO_BY_RACE } from '../game/data/heroes.js'
import { INITIAL_SCENARIO_ID } from '../game/data/scenarios.js'

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0+dev'

export function MainMenu() {
  const navigate = useNavigate()
  const { player, logout } = useAuth()
  const hero = player ? HERO_BY_RACE[player.race] : null
  const displayName = player?.name || 'Kael'

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="page menu-page main-menu-page">
      <div className="main-menu-bg" aria-hidden="true" />
      <div className="main-menu-shade" aria-hidden="true" />

      <header className="main-menu-top">
        <section className="home-player-hud" aria-label="Jugador">
          <div className="home-player-portrait">
            {hero ? <img src={hero.portrait} alt={hero.name} /> : null}
          </div>
          <div className="home-player-info">
            <span className="home-player-name">{displayName}</span>
            <span className="home-level-badge">Nivel {player?.level ?? 5}</span>
            <div className="home-xp-bar">
              <span style={{ width: '71%' }} />
              <strong>850 / 1200</strong>
            </div>
          </div>
        </section>

        <img className="home-wordblade-logo" src="/menu/wordblade-logo.png" alt="Wordblade" />

        <section className="home-resources" aria-label="Recursos">
          <span><b>◉</b> 12,450</span>
          <span><b>◆</b> 320</span>
          <button className="home-icon-btn" type="button" aria-label="Trofeos">🏆</button>
          <button className="home-icon-btn" type="button" aria-label="Mensajes">✉</button>
          <button className="home-icon-btn" type="button" aria-label="Opciones">⚙</button>
        </section>
      </header>

      <main className="main-menu-content">
        <aside className="home-left-rail">
          <section className="home-panel daily-panel">
            <h2>Diario</h2>
            <ul>
              <li><span>Juega 3 batallas</span><strong>2 / 3</strong><em>◆ 50</em></li>
              <li><span>Gana 2 duelos online</span><strong>0 / 2</strong><em>◆ 60</em></li>
              <li><span>Forma 5 palabras</span><strong>0 / 5</strong><em>◆ 40</em></li>
            </ul>
          </section>

          <section className="home-panel reward-panel">
            <h2>Recompensa diaria</h2>
            <div className="reward-chest">▣</div>
            <p>Volvé mañana por más recompensas</p>
            <strong>11:24:15</strong>
          </section>
        </aside>

        <section className="home-hero-stage" aria-label="Campeón activo">
          {hero ? <img src={hero.portrait} alt={hero.name} /> : null}
        </section>

        <section className="home-mode-cards" aria-label="Modos de juego">
          <article className="mode-card mode-card-adventure">
            <img src="/menu/adventure-card.png" alt="" aria-hidden="true" />
            <div className="mode-card-overlay">
              <p>Explorá el reino, enfrentá enemigos y convertite en leyenda.</p>
              <button className="btn mode-card-btn" onClick={() => navigate(`/battle/${INITIAL_SCENARIO_ID}`)}>
                Entrar
              </button>
            </div>
          </article>

          <article className="mode-card mode-card-multiplayer">
            <div className="mode-card-art">
              <span>⚔</span>
            </div>
            <div className="mode-card-title">
              <small>Modo</small>
              <strong>Multijugador</strong>
            </div>
            <p>Desafiá a otros jugadores en duelos en tiempo real.</p>
            <button className="btn mode-card-btn mode-card-btn-red" onClick={() => navigate('/multiplayer')}>
              Ver salas
            </button>
          </article>
        </section>
      </main>

      <footer className="main-menu-bottom">
        <nav className="home-nav-bar" aria-label="Secciones">
          <button type="button">🎒<span>Inventario</span></button>
          <button type="button">📖<span>Habilidades</span></button>
          <button type="button">🛡<span>Héroes</span></button>
          <button type="button">🏪<span>Tienda</span></button>
          <button type="button">⭐<span>Misiones</span></button>
          <button type="button">🏆<span>Ranking</span></button>
        </nav>

        <div className="home-system-actions">
          <PwaInstallButton />
          <button className="btn btn-ghost" onClick={handleLogout}>
            Cerrar sesión
          </button>
          <AppExitButton />
        </div>

        <p className="menu-version">v{APP_VERSION}</p>
      </footer>
    </div>
  )
}
