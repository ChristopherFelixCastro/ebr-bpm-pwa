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
import CoreIntegrationPage from '../features/core/CoreIntegrationPage'

function AppRouter() {
  return (
    <Routes>
      <Route element={<CoordinatorLayout />}>
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

        <Route
          path="/core"
          element={<CoreIntegrationPage />}
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
