import { useEffect, useState } from 'react'
import {
  getInstallPrompt,
  subscribeInstallPrompt,
  isAppInstalled,
  promptInstall,
  hardRefreshApp
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

// Siempre muestra bienvenida al iniciar. En celular + navegador bloquea el
// juego con la instalación; en PC o app instalada deja entrar después.
export function InstallGate({ children }) {
  const [gate] = useState(() => typeof window !== 'undefined' && isMobileDevice() && !isAppInstalled())
  const [showWelcome, setShowWelcome] = useState(true)
  // El prompt lo captura services/pwaInstall.js a nivel módulo (puede llegar
  // antes de montar React); acá solo se lee y se escucha por cambios.
  const [installPrompt, setInstallPrompt] = useState(() => (gate ? getInstallPrompt() : null))
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [updateStatus, setUpdateStatus] = useState(null)

  useEffect(() => {
    if (!gate) return

    const unsubscribe = subscribeInstallPrompt((prompt) => {
      setInstallPrompt(prompt)
      // Llegó el instalador automático: se esconde el plan B.
      if (prompt) setShowHelp(false)
    })
    const handleInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      unsubscribe()
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [gate])

  if (!gate && !showWelcome) return children

  async function handleInstall() {
    // Plan A: el diálogo nativo. Si no está disponible o el usuario lo
    // canceló, plan B: instrucciones para instalar desde el menú.
    if (installPrompt) {
      try {
        const accepted = await promptInstall()
        if (accepted) return
      } catch {
        // El evento ya se había consumido o el navegador lo rechazó.
      }
    }
    setShowHelp(true)
  }

  async function handleUpdate() {
    setUpdateStatus('Buscando actualización...')
    try {
      await hardRefreshApp()
      setUpdateStatus('Wordblade ya está al día.')
    } catch {
      setUpdateStatus('No se pudo actualizar. Revisá la conexión e intentá de nuevo.')
    }
  }

  function handleEnter() {
    if (gate) return
    setShowWelcome(false)
  }

  return (
    <div className="page menu-page install-gate">
      <div className="menu-panel install-gate-panel welcome-gate-panel">
        <img className="game-logo" src="/icons/icon-192.png" alt="Wordblade" />
        <h1 className="install-gate-title">Bienvenido a Wordblade</h1>

        {installed ? (
          <p className="install-gate-text">
            ¡Listo! Wordblade ya está instalado. Cerrá esta pestaña y abrí el juego desde el ícono
            en tu pantalla de inicio.
          </p>
        ) : (
          <>
            <p className="install-gate-text">
              Forjá palabras, cargá energía y peleá con tus campeones sabios.
            </p>

            {gate ? (
              <p className="install-gate-text">
                Estás entrando desde el navegador del celular. Para jugar bien, instalá Wordblade:
                se abre en pantalla completa, horizontal y sin barras del navegador.
              </p>
            ) : (
              <p className="install-gate-text">
                Entrá al juego o buscá la última versión antes de empezar.
              </p>
            )}

            {gate && !isSecureInstallContext() ? (
              <p className="install-gate-text">
                Ojo: la instalación solo funciona con HTTPS. Abrí Wordblade desde su dirección
                https:// (las URLs http:// con IP local no la habilitan).
              </p>
            ) : null}

            <div className="install-gate-actions">
              {gate ? (
                <button className="btn install-btn install-gate-btn" type="button" onClick={handleInstall}>
                  Instalar
                </button>
              ) : (
                <button className="btn install-btn install-gate-btn" type="button" onClick={handleEnter}>
                  Entrar al juego
                </button>
              )}
              <button className="btn btn-ghost install-gate-btn" type="button" onClick={handleUpdate}>
                Actualizar
              </button>
            </div>

            {updateStatus ? <p className="install-gate-status">{updateStatus}</p> : null}

            {showHelp ? (
              <>
                <p className="install-gate-text install-gate-help-intro">
                  ¿No apareció el instalador? Hacelo desde el menú del navegador:
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
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
