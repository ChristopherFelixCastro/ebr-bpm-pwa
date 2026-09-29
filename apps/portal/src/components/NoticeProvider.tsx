import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Alert, Snackbar, type AlertColor } from '@mui/material'

type Notice = { showSuccess: (message: string) => void; showError: (message: string) => void }
const Context = createContext<Notice | null>(null)

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; severity: AlertColor } | null>(null)
  const showSuccess = useCallback((message: string) => setNotice({ message, severity: 'success' }), [])
  const showError = useCallback((message: string) => setNotice({ message, severity: 'error' }), [])
  const value = useMemo(() => ({ showSuccess, showError }), [showSuccess, showError])
  return <Context.Provider value={value}>{children}<Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert severity={notice?.severity ?? 'info'} onClose={() => setNotice(null)} variant="filled">{notice?.message}</Alert></Snackbar></Context.Provider>
}
export function useNotification() { const value = useContext(Context); if (!value) throw new Error('NoticeProvider no disponible'); return value }
