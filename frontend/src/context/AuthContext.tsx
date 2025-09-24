import { createContext, useContext, useEffect, useState } from 'react'
import { api, type Tokens } from '../lib/api'
import Session from '../helpers/Session'

type User = { id: string; name: string; email: string; role?: any[]; companies?: string[] } | null

type AuthContextType = {
  user: User
  tokens: Tokens | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [tokens, setTokens] = useState<Tokens | null>(api.getTokens())

  useEffect(() => {
    if (tokens) {
      api.me().then((data) => {
        const u = data.user || data
        setUser(u)
        try { Session.set('user', u) } catch {}
      }).catch(() => setUser(null))
    }
  }, [tokens])

  async function login(email: string, password: string) {
    const data = await api.login(email, password)
    setTokens(api.getTokens())
    setUser(data.user)
    try { Session.set('user', data.user) } catch {}
    window.location.href = '/companies'
  }

  function logout() {
    api.clearTokens()
    Session.clearAllCookies()
    setTokens(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, tokens, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


