import { useEffect, useState } from 'react'
import {
  getInstallPrompt,
  subscribeInstallPrompt,
  isAppInstalled,
  promptInstall
} from '../services/pwaInstall.js'

function isiOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function PwaInstallButton() {
  // Se lee el prompt ya capturado por el módulo (puede haber llegado antes de
  // montar este componente) y se sigue escuchando por si aparece después.
  const [installPrompt, setInstallPrompt] = useState(() => getInstallPrompt())
  const [installed, setInstalled] = useState(() => isAppInstalled())
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeInstallPrompt((prompt) => {
      setInstallPrompt(prompt)
      if (prompt) setShowHelp(false)
    })
    const handleInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      unsubscribe()
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed) return null

  async function handleInstall() {
    // Si el navegador ya nos dio el prompt nativo, lo lanzamos directo.
    if (installPrompt) {
      await promptInstall()
      return
    }
    // Sin prompt (iOS, o el navegador aún no lo ofreció): mostramos ayuda.
    setShowHelp((current) => !current)
  }

  const help = isiOS()
    ? 'En iPhone: tocá Compartir → “Agregar a pantalla de inicio”.'
    : 'Si no aparece el instalador, abrí el menú del navegador (⋮) y elegí “Instalar app”. Requiere HTTPS o localhost.'

  return (
    <div className="install-card">
      <button className="btn install-btn" type="button" onClick={handleInstall}>
        {installPrompt ? 'Instalar Wordblade' : 'Cómo instalar'}
      </button>
      {showHelp && !installPrompt ? <p>{help}</p> : null}
    </div>
  )
}
