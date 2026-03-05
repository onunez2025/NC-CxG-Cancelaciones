import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
// import { useTranslation } from 'react-i18next';
import { MainLayout } from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ForceChangePasswordPage } from './pages/ForceChangePasswordPage';
import { UsersPage } from './pages/config/UsersPage';
import { RolesPage } from './pages/config/RolesPage';
import { ConfigLayout } from './pages/config/ConfigLayout';

// Placeholder Pages
import { DashboardPage } from './pages/DashboardPage';
const NotFound = () => <div className="p-4"><h1>404 Not Found</h1></div>;
import { CostCentersPage } from './pages/config/CostCentersPage';
// const CostCentersPage = () => <div className="p-4"><h1 className="text-xl font-bold">Centros de Coste</h1><p>Gestión de CeCos (Próximamente)</p></div>;
import { AccountsPage } from './pages/config/AccountsPage';
import { ManagementsPage } from './pages/config/ManagementsPage';
import { ExchangeRatesPage } from './pages/config/ExchangeRatesPage';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium text-sm animate-pulse">Verificando sesión...</p>
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
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Config Routes */}
              <Route path="/config" element={<ConfigLayout />}>
                <Route index element={<Navigate to="users" replace />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="cecos" element={<CostCentersPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="managements" element={<ManagementsPage />} />
                <Route path="exchange-rates" element={<ExchangeRatesPage />} />
              </Route>

              {/* Other routes placeholders */}
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/budget-vs-real" element={<BudgetVsRealPage />} />
              <Route path="/solped" element={<SolpedPage />} />
              <Route path="/files" element={<FileUploadPage />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
