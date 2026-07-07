import { useEffect, useMemo, useState } from 'react'

function isStandaloneDisplay() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isProbablyMobile() {
  return window.matchMedia?.('(max-width: 820px), (pointer: coarse)').matches ?? false
}

function isiOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const mobile = useMemo(() => typeof window !== 'undefined' && isProbablyMobile(), [])

  useEffect(() => {
    setInstalled(isStandaloneDisplay())

    const handlePrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setShowHelp(false)
    }

    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      setShowHelp(false)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed || !mobile) return null

  async function handleInstall() {
    if (!installPrompt) {
      setShowHelp((current) => !current)
      return
    }

    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const fallbackText = isiOS()
    ? 'En iPhone: Compartir > Agregar a pantalla de inicio.'
    : 'Si no aparece el instalador, abrí el menú del navegador y elegí Instalar app.'

  return (
    <div className="install-card">
      <button className="btn install-btn" type="button" onClick={handleInstall}>
        Instalar en celular
      </button>
      {showHelp ? <p>{fallbackText}</p> : null}
    </div>
  )
}
