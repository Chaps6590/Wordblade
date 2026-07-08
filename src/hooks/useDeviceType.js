// Detección de dispositivo en JS (no solo en CSS).
//
// El CSS ya adapta el layout con media queries; este hook es para cuando la
// LÓGICA cambia según el dispositivo: mostrar teclado físico vs fichas táctiles,
// activar drag en Phaser, ocultar el botón de instalar PWA en desktop, etc.
//
// Se apoya en `matchMedia` + `useSyncExternalStore` (idiomático en React 19):
// nada de listeners manuales ni flicker en el primer render.

import { useSyncExternalStore } from 'react'

// Breakpoint por debajo del cual tratamos el ancho como "mobile".
// Coincide con los media queries de menu.css (max-width: 920px landscape).
const MOBILE_MAX_WIDTH = 920

// Suscripción genérica a un media query. Cacheada por query para no crear un
// MediaQueryList nuevo en cada render.
const queryCache = new Map()

function getMediaQueryStore(query) {
  if (queryCache.has(query)) return queryCache.get(query)

  const supported = typeof window !== 'undefined' && 'matchMedia' in window
  const mql = supported ? window.matchMedia(query) : null

  const store = {
    subscribe(callback) {
      if (!mql) return () => {}
      // Safari viejo usa addListener; el resto addEventListener.
      if (mql.addEventListener) {
        mql.addEventListener('change', callback)
        return () => mql.removeEventListener('change', callback)
      }
      mql.addListener(callback)
      return () => mql.removeListener(callback)
    },
    getSnapshot() {
      return mql ? mql.matches : false
    },
    // En SSR/build no hay window: asumimos desktop (false) para no romper.
    getServerSnapshot() {
      return false
    }
  }

  queryCache.set(query, store)
  return store
}

// Hook base reutilizable: `useMediaQuery('(min-width: 600px)')`.
export function useMediaQuery(query) {
  const store = getMediaQueryStore(query)
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  )
}

// ¿El puntero principal es táctil? (celular/tablet vs mouse/trackpad).
// Más fiable que el userAgent para decidir input.
export function useIsTouch() {
  return useMediaQuery('(pointer: coarse)')
}

// ¿Estamos en vertical? Útil junto al OrientationLock.
export function useIsPortrait() {
  return useMediaQuery('(orientation: portrait)')
}

function isMobileUserAgent() {
  if (typeof window === 'undefined') return false
  if (window.navigator.userAgentData?.mobile) return true
  const iPadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent) || iPadOs
}

// Señal principal: "mobile" = pantalla chica Y puntero táctil.
// Pedimos ambas para no tratar como mobile una ventana de desktop angosta.
export function useIsMobile() {
  const narrow = useMediaQuery(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
  const touch = useIsTouch()
  return narrow && (touch || isMobileUserAgent())
}
