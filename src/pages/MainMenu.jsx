import { useNavigate } from 'react-router-dom'

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
      </div>
    </div>
  )
}
