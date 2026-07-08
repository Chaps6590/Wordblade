import { useEffect, useState } from 'react'
import {
  getInstallPrompt,
  subscribeInstallPrompt,
  isAppInstalled,
  promptInstall
} from '../services/pwaInstall.js'

// Detección por dispositivo (no por tamaño de ventana): una ventana angosta
// de PC no debe quedar bloqueada por la pantalla de instalación.
function isMobileDevice() {
  if (window.navigator.userAgentData?.mobile) return true
  const iPadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent) || iPadOs
}

function isiOS() {
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  )
}

function isSecureInstallContext() {
  return window.isSecureContext || window.location.hostname === 'localhost'
}

// Chrome dispara beforeinstallprompt poco después de cargar; se espera este
// margen antes de asumir que no hay instalador automático.
const PROMPT_GRACE_MS = 2500

// Celular + navegador: bloquea el juego con la pantalla de instalación.
// PC o app instalada: renderiza el juego normalmente.
export function InstallGate({ children }) {
  const [gate] = useState(() => typeof window !== 'undefined' && isMobileDevice() && !isAppInstalled())
  // El prompt lo captura services/pwaInstall.js a nivel módulo (puede llegar
  // antes de montar React); acá solo se lee y se escucha por cambios.
  const [installPrompt, setInstallPrompt] = useState(() => (gate ? getInstallPrompt() : null))
  const [installed, setInstalled] = useState(false)
  const [graceOver, setGraceOver] = useState(
    () => typeof window !== 'undefined' && (isiOS() || !isSecureInstallContext())
  )

  useEffect(() => {
    if (!gate) return

    const unsubscribe = subscribeInstallPrompt(setInstallPrompt)
    const handleInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', handleInstalled)
    const timeoutId = window.setTimeout(() => setGraceOver(true), PROMPT_GRACE_MS)

    return () => {
      unsubscribe()
      window.removeEventListener('appinstalled', handleInstalled)
      window.clearTimeout(timeoutId)
    }
  }, [gate])

  if (!gate) return children

  return (
    <div className="page menu-page install-gate">
      <div className="menu-panel install-gate-panel">
        <img className="game-logo" src="/icons/icon-192.png" alt="Wordblade" />
        <h1 className="install-gate-title">Instalá Wordblade</h1>

        {installed ? (
          <p className="install-gate-text">
            ¡Listo! Wordblade ya está instalado. Cerrá esta pestaña y abrí el juego desde el ícono
            en tu pantalla de inicio.
          </p>
        ) : installPrompt ? (
          <>
            <p className="install-gate-text">
              Para jugar en el celular instalá la app: pantalla completa, en horizontal y sin
              distracciones del navegador.
            </p>
            <button className="btn install-btn install-gate-btn" type="button" onClick={promptInstall}>
              Instalar Wordblade
            </button>
          </>
        ) : !isSecureInstallContext() ? (
          <p className="install-gate-text">
            Para instalar desde el celular, abrí Wordblade con HTTPS. Las URLs http:// con IP
            local no habilitan la instalación.
          </p>
        ) : graceOver ? (
          <>
            <p className="install-gate-text">
              Para jugar en el celular instalá la app desde el menú del navegador:
            </p>
            {isiOS() ? (
              <ol className="install-gate-steps">
                <li>Abrí esta página en Safari.</li>
                <li>Tocá el botón <b>Compartir</b> (el cuadrado con la flecha).</li>
                <li>Elegí <b>Agregar a pantalla de inicio</b>.</li>
                <li>Abrí Wordblade desde el ícono nuevo.</li>
              </ol>
            ) : (
              <ol className="install-gate-steps">
                <li>Abrí el menú del navegador (⋮ o ≡).</li>
                <li>Elegí <b>Instalar app</b> o <b>Agregar a pantalla de inicio</b>.</li>
                <li>Abrí Wordblade desde el ícono nuevo.</li>
              </ol>
            )}
          </>
        ) : (
          <p className="install-gate-text">Preparando el instalador…</p>
        )}
      </div>
    </div>
  )
}
