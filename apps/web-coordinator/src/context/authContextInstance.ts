import { createContext } from 'react'
import type { CurrentUser } from '../api/authApi'

export interface AuthContextValue {
  currentUser: CurrentUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<CurrentUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
