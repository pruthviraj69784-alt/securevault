import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('sv_user')) } catch { return null }
  })
  const [token, setToken]       = useState(() => localStorage.getItem('sv_token') || null)
  const [loading, setLoading]   = useState(true)
  // ZK passphrase is kept only in memory — never persisted
  const [zkPassphrase, setZkPassphrase] = useState('')

  // Verify token on mount
  useEffect(() => {
    if (token) {
      authApi.me()
        .then(res => setUser(res.data.data))
        .catch(() => logout())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password })
    const { token: tok, user: u } = res.data.data
    localStorage.setItem('sv_token', tok)
    localStorage.setItem('sv_user', JSON.stringify(u))
    setToken(tok)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (data) => {
    const res = await authApi.register(data)
    return res.data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sv_token')
    localStorage.removeItem('sv_user')
    setToken(null)
    setUser(null)
    setZkPassphrase('')
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, zkPassphrase, setZkPassphrase }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
