import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { adminApi } from '../services/api'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sv_admin_user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('sv_admin_token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      adminApi.me()
        .then(res => setUser(res.data.data))
        .catch(() => logout())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  const login = useCallback(async (email, password) => {
    const res = await adminApi.login({ email, password })
    const { token: tok, user: u } = res.data.data
    if (u.role?.toUpperCase() !== 'ADMIN') {
      throw new Error('Access denied. Administrator privileges required.')
    }
    localStorage.setItem('sv_admin_token', tok)
    localStorage.setItem('sv_admin_user', JSON.stringify(u))
    setToken(tok)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sv_admin_token')
    localStorage.removeItem('sv_admin_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return ctx
}
