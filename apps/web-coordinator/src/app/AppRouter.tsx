import { type ReactNode } from 'react'
import {
  Box,
  CircularProgress,
} from '@mui/material'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import CoordinatorLayout from './CoordinatorLayout'

import DashboardPage from '../features/dashboard/DashboardPage'
import CasesPage from '../features/cases/CasesPage'
import CaseDetailPage from '../features/cases/CaseDetailPage'
import AlertsPage from '../features/alerts/AlertsPage'
import ComplaintsPage from '../features/complaints/ComplaintsPage'
import InstitutionalPage from '../features/institutional/InstitutionalPage'
import SchedulingPage from '../features/scheduling/SchedulingPage'
import AssignmentsPage from '../features/assignments/AssignmentsPage'
import CalendarPage from '../features/calendar/CalendarPage'
import { LoginPage } from '../features/auth/LoginPage'
import { coordinatorAllowedRoles } from '../context/authTypes'
import { useAuth } from '../context/useAuth'

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#f4f6f8' }}>
        <CircularProgress sx={{ color: '#0b2545' }} />
      </Box>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (!coordinatorAllowedRoles.includes(currentUser.roleCode)) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#f4f6f8', p: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <h2>403 - Acceso Denegado</h2>
          <p>Su rol no tiene autorización para acceder al Portal de Coordinación.</p>
        </Box>
      </Box>
    )
  }

  return <>{children}</>
}

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#f4f6f8' }}>
        <CircularProgress sx={{ color: '#0b2545' }} />
      </Box>
    )
  }

  return currentUser ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <CoordinatorLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/cases"
          element={<CasesPage />}
        />

        <Route
          path="/cases/:caseId"
          element={<CaseDetailPage />}
        />

        <Route
          path="/alerts"
          element={<AlertsPage />}
        />

        <Route
          path="/complaints"
          element={<ComplaintsPage />}
        />

        <Route
          path="/institutional"
          element={<InstitutionalPage />}
        />

        <Route
          path="/scheduling"
          element={<SchedulingPage />}
        />

        <Route
          path="/assignments"
          element={<AssignmentsPage />}
        />

        <Route
          path="/calendar"
          element={<CalendarPage />}
        />
      </Route>

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  )
}

export default AppRouter