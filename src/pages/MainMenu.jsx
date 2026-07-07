import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0+dev'
const RACE_LABELS = {
  LOBO: 'Sabios Lobo',
  TIGRE: 'Sabios Tigre',
  AGUILA: 'Sabios Águila'
}

export function MainMenu() {
  const navigate = useNavigate()
  const { player, logout } = useAuth()

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="page menu-page">
      <div className="menu-panel">
        <img className="game-logo" src="/icons/icon-512.png" alt="Emblema de Wordblade" />
        <h1 className="game-title">
          Wordblade
          <span className="game-subtitle">Palabras · Acero · Magia</span>
        </h1>
        <p className="game-tagline">Forjá palabras. Desatá el acero.</p>

        {player ? (
          <div className="player-badge">
            <span>{player.name}</span>
            <small>{RACE_LABELS[player.race] ?? player.race}</small>
          </div>
        ) : null}

        <nav className="menu-buttons">
          <button className="btn btn-primary" onClick={() => navigate('/scenarios')}>
            ⚔ Nueva Partida
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </nav>

        <p className="menu-footer">“Primero mecánica divertida. Después arte, historia y expansión.”</p>
        <p className="menu-version">v{APP_VERSION}</p>
      </div>
    </div>
  )
}
