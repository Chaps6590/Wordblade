import { useState } from 'react'

export function AppExitButton() {
  const [blocked, setBlocked] = useState(false)

  function handleExit() {
    setBlocked(false)
    window.close()

    window.setTimeout(() => {
      if (!document.hidden) setBlocked(true)
    }, 220)
  }

  return (
    <div className="exit-card">
      <button className="btn btn-exit" type="button" onClick={handleExit}>
        Salir del juego
      </button>
      {blocked ? <p>Cerrá Wordblade desde el gesto o selector de apps del celular.</p> : null}
    </div>
  )
}
