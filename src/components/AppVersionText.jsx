import { useEffect, useState } from 'react'

const INITIAL_VERSION = {
  version: import.meta.env.VITE_APP_VERSION || '0.1.0+dev',
  commit: import.meta.env.VITE_APP_COMMIT || 'sin-git'
}

function normalizeVersion(data) {
  const commit = String(data?.commit ?? '').trim()
  const version = String(data?.version ?? '').trim()

  return {
    commit: commit || INITIAL_VERSION.commit,
    version: version || INITIAL_VERSION.version
  }
}

export function AppVersionText({ className = 'menu-version' }) {
  const [appVersion, setAppVersion] = useState(INITIAL_VERSION)

  useEffect(() => {
    let cancelled = false

    async function loadVersion() {
      try {
        const response = await fetch(`/version.json?ts=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache'
          }
        })
        if (!response.ok) return

        const data = await response.json()
        if (!cancelled) setAppVersion(normalizeVersion(data))
      } catch {
        // El valor embebido por Vite queda como fallback.
      }
    }

    loadVersion()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p className={className} title={`Versión ${appVersion.version}`}>
      commit {appVersion.commit}
    </p>
  )
}
