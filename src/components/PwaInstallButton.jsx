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

function isAndroid() {
  return /android/i.test(window.navigator.userAgent)
}

function isSecureInstallContext() {
  return window.isSecureContext || window.location.hostname === 'localhost'
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

  const help = !isSecureInstallContext()
    ? 'Para instalar desde el celular, abri Wordblade con HTTPS. Las URLs http:// con IP local no habilitan instalacion.'
    : isiOS()
      ? 'En iPhone: toca Compartir y elegi Agregar a pantalla de inicio.'
      : isAndroid()
        ? 'En Android: abri el menu del navegador y elegi Instalar app o Agregar a pantalla principal.'
        : 'Si no aparece el instalador, abri el menu del navegador y elegi Instalar app.'

  return (
    <div className="install-card">
      <button className="btn install-btn" type="button" onClick={handleInstall}>
        {installPrompt ? 'Instalar Wordblade' : 'Cómo instalar'}
      </button>
      {showHelp && !installPrompt ? <p>{help}</p> : null}
    </div>
  )
}
