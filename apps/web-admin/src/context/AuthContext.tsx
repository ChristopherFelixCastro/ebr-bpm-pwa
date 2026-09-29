import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type CurrentUser } from '../api/auth'
import { clearAccessToken, setSessionExpiredHandler } from '../api/http'

interface AuthContextValue {
  currentUser: CurrentUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<CurrentUser>
  logout: () => Promise<void>
  reauthenticate: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const acceptApprovedUser = (user: CurrentUser | null) => user?.status === 'APPROVED' ? user : null

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    setSessionExpiredHandler(() => {
      if (active) setCurrentUser(null)
    })

    void authApi.restore().then((user) => {
      if (!active) return
      const approvedUser = acceptApprovedUser(user)
      if (!approvedUser) clearAccessToken()
      setCurrentUser(approvedUser)
    }).finally(() => {
      if (active) setIsLoading(false)
    })

    return () => {
      active = false
      setSessionExpiredHandler(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    isLoading,
    login: async (email, password) => {
      const user = await authApi.login(email, password)
      if (user.status !== 'APPROVED') {
        clearAccessToken()
        throw new Error('La cuenta no está habilitada para iniciar sesión.')
      }
      setCurrentUser(user)
      return user
    },
    logout: async () => {
      try {
        await authApi.logout()
      } finally {
        setCurrentUser(null)
      }
    },
    reauthenticate: (password) => authApi.reauthenticate(password),
  }), [currentUser, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
