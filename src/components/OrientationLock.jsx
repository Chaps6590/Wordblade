import { useEffect } from 'react'
import { useIsMobile, useIsPortrait } from '../hooks/useDeviceType.js'

// Arranca el juego en horizontal. Bloquea la orientación con la Screen
// Orientation API: funciona en la PWA instalada (junto con el manifest, que
// ya declara orientation landscape), así la app abre y se queda en horizontal.
// En navegador el lock puede rechazarse; si es un celular en vertical mostramos
// un bloqueo visual simple sin afectar ventanas angostas de escritorio.
export function OrientationLock() {
  const isMobile = useIsMobile()
  const isPortrait = useIsPortrait()

  useEffect(() => {
    const lockLandscape = () => {
      try {
        const result = window.screen?.orientation?.lock?.('landscape')
        if (result && typeof result.catch === 'function') result.catch(() => {})
      } catch {
        // API no disponible: el manifest y el CSS responsive se encargan.
      }
    }

    lockLandscape()
    window.addEventListener('orientationchange', lockLandscape)
    return () => window.removeEventListener('orientationchange', lockLandscape)
  }, [])

  if (!isMobile || !isPortrait) return null

  return (
    <div className="orientation-blocker" role="status" aria-live="polite">
      <div className="orientation-blocker__panel">
        <span className="orientation-blocker__icon" aria-hidden="true">↻</span>
        <p className="orientation-blocker__title">Girando tu dispositivo</p>
        <p className="orientation-blocker__text">vivirás una mejor experiencia.</p>
      </div>
    </div>
  )
}
