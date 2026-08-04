import React from 'react'
import { api, getApiBaseUrl } from './api.js'

const TOKEN_KEY = 'polyglot_jwt'
const AuthContext = React.createContext(null)

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  const refreshUser = React.useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const me = await api.me()
      setUser(me)
    } catch (_) {
      setToken('')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refreshUser()
  }, [refreshUser])

  async function login(email, password) {
    const res = await api.login({ email, password })
    setToken(res.access_token)
    setUser({ email: res.email, role: res.role })
  }

  async function register(email, password) {
    const res = await api.register({ email, password })
    setToken(res.access_token)
    setUser({ email: res.email, role: res.role })
  }

  function logout() {
    setToken('')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
