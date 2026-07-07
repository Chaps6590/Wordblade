import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthContext.jsx'
import { useAuth } from '../auth/useAuth.js'
import { LoginPage } from '../pages/LoginPage.jsx'
import { OrientationLock } from '../components/OrientationLock.jsx'
import { routes } from './routes.jsx'

export function App() {
  return (
    <BrowserRouter>
      <OrientationLock />
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<ProtectedRoute>{route.element}</ProtectedRoute>}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="page menu-page">
      <div className="menu-panel loading-panel">
        <img className="game-logo login-logo" src="/icons/icon-192.png" alt="Wordblade" />
        <p className="game-tagline">Invocando sesión…</p>
      </div>
    </div>
  )
}
