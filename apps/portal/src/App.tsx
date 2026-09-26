import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { capabilities, hasCapability, homeFor } from './access/capabilities'
import { PortalLayout } from './components/PortalLayout'
import { SessionProvider, useSession } from './session/SessionContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { AccountPage } from './pages/AccountPage'
import { OfflineAccessPage, OfflinePackagesPage } from './pages/OfflinePages'
import { StatusPage } from './pages/StatusPage'
import { NoticeProvider } from './components/NoticeProvider'
import { CompanyListPage } from './pages/companies/CompanyListPage'
import { CompanyDetailPage } from './pages/companies/CompanyDetailPage'
import { EstablishmentListPage } from './pages/companies/EstablishmentListPage'
import { EstablishmentDetailPage } from './pages/companies/EstablishmentDetailPage'
import { ContactListPage } from './pages/companies/ContactListPage'
import { RequestListPage } from './pages/requests/RequestListPage'
import { RequestFormPage } from './pages/requests/RequestFormPage'
import { RequestDetailPage } from './pages/requests/RequestDetailPage'
import { DocumentReviewPage } from './pages/requests/DocumentReviewPage'
import { CaseListPage } from './pages/operation/CaseListPage'
import { CaseDetailPage } from './pages/operation/CaseDetailPage'
import { CaseSourceFormPage } from './pages/operation/CaseSourceFormPage'
import { OperationHistoryPage } from './pages/operation/OperationHistoryPage'
import { FieldAssignmentsPage } from './pages/field/FieldAssignmentsPage'
import { FieldInspectionPage } from './pages/field/FieldInspectionPage'
import { EvaluationListPage } from './pages/evaluations/EvaluationListPage'
import { EvaluationDetailPage } from './pages/evaluations/EvaluationDetailPage'
import { ReviewPage } from './pages/evaluations/ReviewPage'
import { CorrectionsInboxPage } from './pages/evaluations/CorrectionsInboxPage'
import { CorrectionPage } from './pages/evaluations/CorrectionPage'
import { UserListPage } from './pages/users/UserListPage'
import { UserDetailPage } from './pages/users/UserDetailPage'
import { CatalogDetailPage, CatalogListPage, CatalogVersionPage } from './pages/configuration/CatalogPages'
import { BpmTemplateDetailPage, BpmTemplateListPage, BpmTemplateVersionPage } from './pages/configuration/BpmTemplatePages'
import { RiskRuleDetailPage, RiskRuleListPage, RiskRuleVersionPage } from './pages/configuration/RiskRulePages'
import { theme } from './theme'

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession()
  if (loading) return <StatusPage title="Restaurando sesión…" />
  if (user) return <Navigate to={homeFor(user.roleCode)} replace />
  return children
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession()
  const location = useLocation()
  if (loading) return <StatusPage title="Restaurando sesión…" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <PortalLayout>{children}</PortalLayout>
}

function FieldRoute({ children }: { children: React.ReactNode }) {
  const { user, offlineUser, loading } = useSession()
  if (loading) return <StatusPage title="Restaurando sesión…" />
  const actor = user ?? offlineUser
  if (!actor) return <Navigate to={navigator.onLine ? '/login' : '/acceso-sin-conexion'} replace />
  if (actor.roleCode !== 'EVALUATOR' && actor.roleCode !== 'UNIVERSAL') return <StatusPage title="Acceso denegado" />
  return user ? <PortalLayout>{children}</PortalLayout> : children
}

function CapabilityPage({ id, children }: { id: string; children: React.ReactNode }) {
  const { user } = useSession()
  const capability = capabilities.find((item) => item.id === id)
  if (!capability?.ready || !hasCapability(user, capability)) return <StatusPage title="Acceso denegado" description="Su cuenta no tiene permiso para abrir esta página." />
  return children
}

function CompanyRequestEditor({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  if (user?.roleCode === 'COORDINATOR' || ((user?.roleCode === 'COMPANY_ADMIN' || user?.roleCode === 'DELEGATE') && !user.companyId)) return <StatusPage title="Acceso denegado" description="Su cuenta no tiene una empresa activa autorizada para crear borradores." />
  return children
}

function ProtectedDestination() {
  const { user } = useSession()
  const { pathname } = useLocation()
  const capability = [...capabilities].sort((a, b) => b.path.length - a.path.length)
    .find(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
  if (!capability) return <StatusPage title="Página no encontrada" description="La dirección no corresponde a una página del portal." />
  if (!hasCapability(user, capability)) return <StatusPage title="Acceso denegado" description="Su cuenta no tiene permiso para abrir esta sección." />
  if (capability.ready) return <StatusPage title="Página no encontrada" description="La dirección no corresponde a una página disponible." />
  return <StatusPage title="Función pendiente de migración" description="Esta pantalla aún no está disponible en el portal único." />
}

function OnlineRoutes() {
  return <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/recuperar-clave" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/acceso-sin-conexion" element={<OfflineAccessPage />} />
    <Route path="/campo/paquetes" element={<OfflinePackagesPage />} />
    <Route path="/campo/asignadas" element={<PrivateRoute><CapabilityPage id="field"><FieldAssignmentsPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/campo/inspecciones/:id" element={<FieldRoute><FieldInspectionPage /></FieldRoute>} />
    <Route path="/campo/correcciones" element={<PrivateRoute><CapabilityPage id="corrections"><CorrectionsInboxPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/campo/correcciones/:id" element={<PrivateRoute><CapabilityPage id="corrections"><CorrectionPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/" element={<Navigate to="/inicio" replace />} />
    <Route path="/inicio" element={<PrivateRoute><HomePage /></PrivateRoute>} />
    <Route path="/cuenta" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
    <Route path="/denegado" element={<PrivateRoute><StatusPage title="Acceso denegado" /></PrivateRoute>} />
    <Route path="/no-encontrado" element={<PrivateRoute><StatusPage title="Recurso no encontrado" /></PrivateRoute>} />
    <Route path="/directorio/empresas" element={<PrivateRoute><CapabilityPage id="companies"><CompanyListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/directorio/empresas/:id" element={<PrivateRoute><CapabilityPage id="companies"><CompanyDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/directorio/establecimientos" element={<PrivateRoute><CapabilityPage id="establishments"><EstablishmentListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/directorio/establecimientos/:id" element={<PrivateRoute><CapabilityPage id="establishments"><EstablishmentDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/directorio/contactos" element={<PrivateRoute><CapabilityPage id="contacts"><ContactListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/solicitudes/documentos-pendientes" element={<PrivateRoute><CapabilityPage id="document-review"><DocumentReviewPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/solicitudes" element={<PrivateRoute><CapabilityPage id="requests"><RequestListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/solicitudes/nueva" element={<PrivateRoute><CapabilityPage id="requests"><CompanyRequestEditor><RequestFormPage /></CompanyRequestEditor></CapabilityPage></PrivateRoute>} />
    <Route path="/solicitudes/:id/editar" element={<PrivateRoute><CapabilityPage id="requests"><CompanyRequestEditor><RequestFormPage /></CompanyRequestEditor></CapabilityPage></PrivateRoute>} />
    <Route path="/solicitudes/:id" element={<PrivateRoute><CapabilityPage id="requests"><RequestDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/casos" element={<PrivateRoute><CapabilityPage id="cases"><CaseListPage key="ALL" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/casos/:id" element={<PrivateRoute><CapabilityPage id="cases"><CaseDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/programas" element={<PrivateRoute><CapabilityPage id="programs"><CaseListPage key="INSTITUTIONAL_PROGRAM" origin="INSTITUTIONAL_PROGRAM" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/programas/nuevo" element={<PrivateRoute><CapabilityPage id="programs"><CaseSourceFormPage origin="INSTITUTIONAL_PROGRAM" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/programas/:id/editar" element={<PrivateRoute><CapabilityPage id="programs"><CaseSourceFormPage origin="INSTITUTIONAL_PROGRAM" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/alertas" element={<PrivateRoute><CapabilityPage id="alerts"><CaseListPage key="HEALTH_ALERT" origin="HEALTH_ALERT" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/alertas/nueva" element={<PrivateRoute><CapabilityPage id="alerts"><CaseSourceFormPage origin="HEALTH_ALERT" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/alertas/:id/editar" element={<PrivateRoute><CapabilityPage id="alerts"><CaseSourceFormPage origin="HEALTH_ALERT" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/denuncias" element={<PrivateRoute><CapabilityPage id="complaints"><CaseListPage key="COMPLAINT" origin="COMPLAINT" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/denuncias/nueva" element={<PrivateRoute><CapabilityPage id="complaints"><CaseSourceFormPage origin="COMPLAINT" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/denuncias/:id/editar" element={<PrivateRoute><CapabilityPage id="complaints"><CaseSourceFormPage origin="COMPLAINT" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/asignaciones" element={<PrivateRoute><CapabilityPage id="assignments"><OperationHistoryPage kind="assignments" /></CapabilityPage></PrivateRoute>} />
    <Route path="/operacion/agenda" element={<PrivateRoute><CapabilityPage id="scheduling"><OperationHistoryPage kind="schedules" /></CapabilityPage></PrivateRoute>} />
    <Route path="/evaluaciones" element={<PrivateRoute><CapabilityPage id="analytics"><EvaluationListPage key="evaluations" mode="evaluations" /></CapabilityPage></PrivateRoute>} />
    <Route path="/evaluaciones/:id" element={<PrivateRoute><CapabilityPage id="analytics"><EvaluationDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/evaluaciones/:id/revision" element={<PrivateRoute><CapabilityPage id="analytics"><ReviewPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/informes" element={<PrivateRoute><CapabilityPage id="reports"><EvaluationListPage key="reports" mode="reports" /></CapabilityPage></PrivateRoute>} />
    <Route path="/historico" element={<PrivateRoute><CapabilityPage id="history"><EvaluationListPage key="history" mode="history" /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/usuarios" element={<PrivateRoute><CapabilityPage id="users"><UserListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/usuarios/:id" element={<PrivateRoute><CapabilityPage id="users"><UserDetailPage /></CapabilityPage></PrivateRoute>} />
    {/* Configuración versionada (F4) */}
    <Route path="/configuracion/catalogos" element={<PrivateRoute><CapabilityPage id="catalogs"><CatalogListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/catalogos/:id" element={<PrivateRoute><CapabilityPage id="catalogs"><CatalogDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/catalogos/:id/versiones/:versionId" element={<PrivateRoute><CapabilityPage id="catalogs"><CatalogVersionPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/plantillas-bpm" element={<PrivateRoute><CapabilityPage id="templates"><BpmTemplateListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/plantillas-bpm/:id" element={<PrivateRoute><CapabilityPage id="templates"><BpmTemplateDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/plantillas-bpm/:id/versiones/:versionId" element={<PrivateRoute><CapabilityPage id="templates"><BpmTemplateVersionPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/reglas-riesgo" element={<PrivateRoute><CapabilityPage id="rules"><RiskRuleListPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/reglas-riesgo/:id" element={<PrivateRoute><CapabilityPage id="rules"><RiskRuleDetailPage /></CapabilityPage></PrivateRoute>} />
    <Route path="/configuracion/reglas-riesgo/:id/versiones/:versionId" element={<PrivateRoute><CapabilityPage id="rules"><RiskRuleVersionPage /></CapabilityPage></PrivateRoute>} />
    <Route path="*" element={<PrivateRoute><ProtectedDestination /></PrivateRoute>} />
  </Routes>
}

export default function App() {
  return <ThemeProvider theme={theme}><CssBaseline /><BrowserRouter><SessionProvider><NoticeProvider><OnlineRoutes /></NoticeProvider></SessionProvider></BrowserRouter></ThemeProvider>
}
