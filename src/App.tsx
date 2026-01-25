import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './stores/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Overview from './pages/Overview';
import Profile from './pages/Profile';
import Reservations from './pages/Reservations';
import Favourites from './pages/Favourites';
import Statistics from './pages/Statistics';
import { CourtBlocking, BlockReasons, Members, MemberDetail, AuditLog, AdminHome, FeatureFlags, Calendar } from './pages/admin';
import HelpCenter from './pages/HelpCenter';
import { NotFound, Forbidden, ServerError } from './pages/errors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // Data stays fresh for 30 seconds
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'administrator' && user.role !== 'teamster') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  // Authenticated users go to dashboard, others to overview
  return <Navigate to={user ? '/dashboard' : '/overview'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect based on auth state */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public routes */}
      <Route path="/overview" element={<Overview />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <ProtectedRoute>
            <Reservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favourites"
        element={
          <ProtectedRoute>
            <Favourites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <ProtectedRoute>
            <Statistics />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminHome />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/blocks"
        element={
          <AdminRoute>
            <CourtBlocking />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reasons"
        element={
          <AdminRoute>
            <BlockReasons />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <AdminRoute>
            <Members />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/members/:id"
        element={
          <AdminRoute>
            <MemberDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <AdminRoute>
            <AuditLog />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/features"
        element={
          <AdminRoute>
            <FeatureFlags />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/calendar"
        element={
          <AdminRoute>
            <Calendar />
          </AdminRoute>
        }
      />
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <HelpCenter />
          </ProtectedRoute>
        }
      />

      {/* Error pages */}
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/error" element={<ServerError />} />

      {/* 404 for unknown routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
