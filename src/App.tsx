import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
// import { useTranslation } from 'react-i18next';
import { MainLayout } from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DialogProvider } from './context/DialogContext';
import { LoginPage } from './pages/LoginPage';
import { ForceChangePasswordPage } from './pages/ForceChangePasswordPage';
import UsersPage from './pages/config/UsersPage';
import RolesPage from './pages/config/RolesPage';
import AuditLogPage from './pages/config/AuditLogPage';
import ConfigLayout from './pages/config/ConfigLayout';
import { RequirePermission } from './components/common/RequirePermission';

// Placeholder Pages
import { DashboardPage } from './pages/DashboardPage';
const NotFound = () => <div className="p-4"><h1>404 Not Found</h1></div>;
import CostCentersPage from './pages/config/CostCentersPage';
// const CostCentersPage = () => <div className="p-4"><h1 className="text-xl font-bold">Centros de Coste</h1><p>Gestión de CeCos (Próximamente)</p></div>;
import AccountsPage from './pages/config/AccountsPage';
import ManagementsPage from './pages/config/ManagementsPage';
import ExchangeRatesPage from './pages/config/ExchangeRatesPage';
import { BudgetPage } from './pages/BudgetPage';
import { FileUploadPage } from './pages/FileUploadPage';
import { TrackingPage } from './pages/TrackingPage';
import { SolpedPage } from './pages/SolpedPage';
import { VendorsPage } from './pages/VendorsPage';
import { BudgetVsRealPage } from './pages/BudgetVsRealPage';
import { ProfilePage } from './pages/ProfilePage';

// ... (lines 48-55 omitted)


const ProtectedRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <img src="/ebm-logo-.png" alt="EBM Logo" className="w-16 h-16 object-contain animate-pulse" />
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Cargando EBM...</p>
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
            <Routes>
              <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Config Routes */}
              <Route element={<RequirePermission permission="ebm.config.users" />}>
                <Route path="/config" element={<ConfigLayout />}>
                  <Route index element={<Navigate to="users" replace />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="roles" element={<RolesPage />} />
                  <Route path="audit" element={<AuditLogPage />} />
                  <Route path="cecos" element={<CostCentersPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="managements" element={<ManagementsPage />} />
                  <Route path="exchange-rates" element={<ExchangeRatesPage />} />
                </Route>
              </Route>

              {/* Other routes with RBAC */}
              <Route element={<RequirePermission permission="budget.view" />}>
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/budget-vs-real" element={<BudgetVsRealPage />} />
              </Route>

              <Route element={<RequirePermission permission="solped.view" />}>
                <Route path="/solped" element={<SolpedPage />} />
              </Route>

              <Route element={<RequirePermission permission="files.view" />}>
                <Route path="/files" element={<FileUploadPage />} />
              </Route>

              <Route element={<RequirePermission permission="tracking.view" />}>
                <Route path="/tracking" element={<TrackingPage />} />
              </Route>

              <Route element={<RequirePermission permission="expenses.view" />}>
                <Route path="/vendors" element={<VendorsPage />} />
              </Route>

              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Routes>
          </DialogProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
