import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
// import { useTranslation } from 'react-i18next';
import { MainLayout } from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useAppConfig } from './context/AppConfigContext';
import { DialogProvider } from './context/DialogContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './pages/LoginPage';
import { ForceChangePasswordPage } from './pages/ForceChangePasswordPage';
import { useEffect } from 'react';
import AuditLogPage from './pages/config/AuditLogPage';
import ConfigLayout from './pages/config/ConfigLayout';

const consoleUrl = import.meta.env.VITE_CONSOLE_URL || (import.meta.env.PROD ? 'https://console.siatc.cloud' : 'http://localhost:3008');

const ExternalRedirect = ({ url }: { url: string }) => {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Redirigiendo a la administración central...</p>
      </div>
    </div>
  );
};
import CostCentersPage from './pages/config/CostCentersPage';
import AccountsPage from './pages/config/AccountsPage';
import ManagementsPage from './pages/config/ManagementsPage';
import ExchangeRatesPage from './pages/config/ExchangeRatesPage';
import { RequirePermission } from './components/common/RequirePermission';

// Placeholder Pages
import { DashboardPage } from './pages/DashboardPage';
import { CancellationsPage } from './pages/cancelaciones/CancellationsPage';
import { CancelacionesMapPage } from './pages/cancelaciones/CancelacionesMapPage';
import { CxGNCPage } from './pages/cxg-nc/CxGNCPage';
import { EmergenciasPage } from './pages/emergencias/EmergenciasPage';
import { FSMDashboardPage } from './pages/fsm/FSMDashboardPage';
import ProgramaSupervisoresPage from './pages/fsm/ProgramaSupervisoresPage';
import { ProfilePage } from './pages/ProfilePage';
import { SpecialCasesPage } from './pages/contact-center/SpecialCasesPage';
import { NotFound } from './pages/NotFound';

// ... (lines 48-55 omitted)


const ProtectedRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const appConfig = useAppConfig();
  const logoUrl = appConfig?.logoUrl || '/Logo.png';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain animate-pulse" />
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.requires_password_change && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" replace />;
  }

  if (!user?.requires_password_change && location.pathname === '/force-change-password') {
    return <Navigate to="/dashboard" replace />;
  }

  if (location.pathname === '/force-change-password') {
    return <Outlet />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

function App() {
  // const { t } = useTranslation();

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <DialogProvider>
            <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Config Routes */}
              <Route element={<RequirePermission permission="config.users" />}>
                <Route path="/config" element={<ConfigLayout />}>
                  <Route index element={<Navigate to="users" replace />} />
                  <Route path="users" element={<ExternalRedirect url={`${consoleUrl}/users`} />} />
                  <Route path="roles" element={<ExternalRedirect url={`${consoleUrl}/roles`} />} />
                  <Route path="audit" element={<AuditLogPage />} />
                  <Route path="cecos" element={<CostCentersPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="managements" element={<ManagementsPage />} />
                  <Route path="exchange-rates" element={<ExchangeRatesPage />} />
                </Route>
              </Route>

              {/* Other routes with RBAC */}
              {/* NC-CxG-Cancelaciones Routes */}
              <Route element={<RequirePermission permission="cxg.cancelaciones.view" />}>
                <Route path="/cancelaciones" element={<CancellationsPage />} />
                <Route path="/cancelaciones/mapa" element={<CancelacionesMapPage />} />
              </Route>
              <Route element={<RequirePermission permission="cxg.cxg_nc.view" />}>
                <Route path="/cxg-nc" element={<CxGNCPage />} />
              </Route>
              <Route element={<RequirePermission permission="cxg.emergencias.view" />}>
                <Route path="/emergencias" element={<EmergenciasPage />} />
              </Route>
              <Route element={<RequirePermission permission="cxg.fsm.view" />}>
                <Route path="/fsm-tracking" element={<FSMDashboardPage />} />
              </Route>
              <Route element={<RequirePermission permission="cxg.programa_supervisores.view" />}>
                <Route path="/fsm/programa-supervisores" element={<ProgramaSupervisoresPage />} />
              </Route>
              <Route element={<RequirePermission permission="cxg.casos_especiales.view" />}>
                <Route path="/contact-center/casos-especiales" element={<SpecialCasesPage />} />
              </Route>

              <Route path="/profile" element={<ProfilePage />} />
            </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </ToastProvider>
          </DialogProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
