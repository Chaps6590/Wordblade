// Captura del evento de instalación de la PWA.
//
// `beforeinstallprompt` se dispara muy temprano (a veces antes de que monte
// React), así que lo interceptamos a nivel de módulo apenas carga la app y
// guardamos el evento diferido. Cualquier componente (el botón del menú)
// puede leerlo o suscribirse a los cambios, sin riesgo de "perderlo".

let deferredPrompt = null
const listeners = new Set()

function notify() {
  for (const listener of listeners) listener(deferredPrompt)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Evita el mini-infobar automático: lo ofrecemos nosotros desde el menú.
    event.preventDefault()
    deferredPrompt = event
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function getInstallPrompt() {
  return deferredPrompt
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isAppInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  )
}

// Lanza el diálogo nativo de instalación. Devuelve true si el usuario aceptó.
export async function promptInstall() {
  if (!deferredPrompt) return false
  // El evento es de un solo uso: se descarta apenas se lanza el diálogo.
  // Si el navegador vuelve a ofrecer instalación, dispara otro
  // beforeinstallprompt y se captura de nuevo.
  const prompt = deferredPrompt
  deferredPrompt = null
  prompt.prompt()
  const choice = await prompt.userChoice
  notify()
  return choice.outcome === 'accepted'
}
