import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type CurrentUser } from '../api/authApi'
import { clearAccessToken, setSessionExpiredHandler } from '../api/http'
import { AuthContext, type AuthContextValue } from './authContextInstance'
import { coordinatorAllowedRoles } from './authTypes'

const acceptApprovedUser = (user: CurrentUser | null) => (user?.status === 'APPROVED' ? user : null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    setSessionExpiredHandler(() => {
      if (active) setCurrentUser(null)
    })

    void authApi
      .restore()
      .then((user) => {
        if (!active) return
        const approvedUser = acceptApprovedUser(user)
        if (!approvedUser) clearAccessToken()
        setCurrentUser(approvedUser)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      setSessionExpiredHandler(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isLoading,
      login: async (email, password) => {
        const user = await authApi.login(email, password)
        if (user.status !== 'APPROVED') {
          clearAccessToken()
          throw new Error('La cuenta no está habilitada para iniciar sesión.')
        }
        if (!coordinatorAllowedRoles.includes(user.roleCode)) {
          clearAccessToken()
          throw new Error('El rol asignado no tiene permisos para acceder al Portal de Coordinación.')
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
    }),
    [currentUser, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
