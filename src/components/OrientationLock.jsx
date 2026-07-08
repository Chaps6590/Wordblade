import { useEffect } from 'react'

// Arranca el juego en horizontal. Bloquea la orientación con la Screen
// Orientation API: funciona en la PWA instalada (junto con el manifest, que
// ya declara orientation landscape), así la app abre y se queda en horizontal
// sin pedirle nada al jugador. En navegador el lock se rechaza y no pasa
// nada: el layout responsive se adapta solo, sin carteles de "girá el
// dispositivo".
export function OrientationLock() {
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

  return null
}
