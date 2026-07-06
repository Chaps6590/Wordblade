import { useNavigate } from 'react-router-dom'

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0+dev'

export function MainMenu() {
  const navigate = useNavigate()

  return (
    <div className="page menu-page">
      <div className="menu-panel">
        <img className="game-logo" src="/icons/icon-512.png" alt="Emblema de Wordblade" />
        <h1 className="game-title">
          Wordblade
          <span className="game-subtitle">Palabras · Acero · Magia</span>
        </h1>
        <p className="game-tagline">Forjá palabras. Desatá el acero.</p>

        <nav className="menu-buttons">
          <button className="btn btn-primary" onClick={() => navigate('/scenarios')}>
            ⚔ Nueva Partida
          </button>
          <button className="btn" onClick={() => navigate('/scenarios')}>
            🗺 Escenarios
          </button>
          <button className="btn" disabled title="Próximamente">
            ⚙ Opciones
          </button>
        </nav>

        <p className="menu-footer">“Primero mecánica divertida. Después arte, historia y expansión.”</p>
        <p className="menu-version">v{APP_VERSION}</p>
      </div>
    </div>
  )
}
