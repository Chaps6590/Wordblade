import { useEffect } from 'react'

// Fuerza el juego a horizontal. Intenta bloquear la orientación (solo
// funciona con la PWA instalada / en fullscreen en Android) y, en cualquier
// caso, un overlay CSS tapa toda la pantalla en vertical pidiendo rotar.
export function OrientationLock() {
  useEffect(() => {
    const lockLandscape = () => {
      try {
        const result = window.screen?.orientation?.lock?.('landscape')
        // En navegador (sin PWA/fullscreen) rechaza: se ignora y queda el cartel.
        if (result && typeof result.catch === 'function') result.catch(() => {})
      } catch {
        // API no disponible: el overlay CSS se encarga.
      }
    }

    lockLandscape()
    window.addEventListener('orientationchange', lockLandscape)
    return () => window.removeEventListener('orientationchange', lockLandscape)
  }, [])

  return (
    <div className="orientation-lock" role="status" aria-live="polite">
      <span className="rotate-icon" aria-hidden="true" />
      <strong>Girá tu dispositivo</strong>
      <p>Wordblade se juega en horizontal.</p>
    </div>
  )
}
