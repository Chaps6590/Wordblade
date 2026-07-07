import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  UNAUTHORIZED_EVENT,
  clearSession,
  getCurrentPlayer,
  getSavedSession,
  loginPlayer,
  logoutPlayer
} from '../services/api.js'
import { AuthContext } from './AuthContextValue.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSavedSession())
  const [player, setPlayer] = useState(() => getSavedSession()?.player ?? null)
  const [loading, setLoading] = useState(Boolean(getSavedSession()?.token))

  useEffect(() => {
    let cancelled = false

    async function refreshPlayer() {
      const savedSession = getSavedSession()
      if (!savedSession?.token) {
        setLoading(false)
        return
      }

      const data = await getCurrentPlayer()
      if (cancelled) return

      if (data?.player) {
        const refreshedSession = { ...savedSession, player: data.player }
        setSession(refreshedSession)
        setPlayer(data.player)
      } else {
        clearSession()
        setSession(null)
        setPlayer(null)
      }
      setLoading(false)
    }

    refreshPlayer()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null)
      setPlayer(null)
      setLoading(false)
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await loginPlayer(credentials)
    setSession(data)
    setPlayer(data.player)
    return data.player
  }, [])

  const logout = useCallback(async () => {
    await logoutPlayer()
    setSession(null)
    setPlayer(null)
  }, [])

  const value = useMemo(
    () => ({ session, player, loading, isAuthenticated: Boolean(session?.token && player), login, logout }),
    [session, player, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
