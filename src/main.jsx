import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app/App.jsx'
// Efecto de módulo: engancha `beforeinstallprompt` apenas arranca la app,
// antes de renderizar React, para no perder el evento de instalación.
import { setServiceWorkerRegistration } from './services/pwaInstall.js'
import { InstallGate } from './components/InstallGate.jsx'
import './styles/tokens.css'
import './styles/global.css'
import './styles/menu.css'
import './styles/battle.css'

const UPDATE_INTERVAL_MS = 60 * 1000

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    setServiceWorkerRegistration(registration)

    const checkForUpdate = async () => {
      if (registration.installing || !navigator.onLine) return

      try {
        const response = await fetch(swUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache'
          }
        })
        if (response.ok) await registration.update()
      } catch {
        // Sin conexión se conserva la versión instalada y se reintenta luego.
      }
    }

    const intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS)
    window.addEventListener('focus', checkForUpdate)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
    window.addEventListener('beforeunload', () => window.clearInterval(intervalId), { once: true })
  },
  onRegisterError(error) {
    console.warn('No se pudo registrar la actualización automática:', error)
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <InstallGate>
      <App />
    </InstallGate>
  </StrictMode>
)
