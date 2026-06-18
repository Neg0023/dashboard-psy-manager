import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken, getToken, setToken } from './tokenStore'
import { decodeJwt } from '@/lib/jwt'
import { setAuthErrorHandler } from '@/lib/authBridge'

export interface AuthUser {
  email: string
  name?: string
  picture?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (idToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null
  const claims = decodeJwt(token)
  if (!claims?.email) return null
  // Ignora token expirado (ID Token do Google dura ~1h).
  if (claims.exp && claims.exp * 1000 < Date.now()) return null
  return { email: claims.email, name: claims.name, picture: claims.picture }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => userFromToken(getToken()))

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const login = useCallback((idToken: string) => {
    setToken(idToken)
    setUser(userFromToken(idToken))
  }, [])

  // Conecta os erros 401/403 do Axios ao fluxo de autenticação.
  useEffect(() => {
    setAuthErrorHandler((status) => {
      if (status === 401) {
        logout()
        navigate('/login', { replace: true })
      } else if (status === 403) {
        navigate('/acesso-negado', { replace: true })
      }
    })
    return () => setAuthErrorHandler(null)
  }, [logout, navigate])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return context
}
