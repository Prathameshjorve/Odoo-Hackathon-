import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import OtpVerify from './pages/auth/OtpVerify';
import ForgotPassword from './pages/auth/ForgotPassword';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';

// Customer pages
import CustomerHome from './pages/customer/Home';
import Booking from './pages/customer/Booking';

const queryClient = new QueryClient();

// Organiser pages
import OrganizerDashboard from './pages/organiser/Dashboard';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<HomeRedirect />}
            />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<OtpVerify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<AuthError />} />

            {/* Customer Routes */}
            <Route path="/customer/home" element={<ProtectedRoute requiredRoles={['customer']}><CustomerHome /></ProtectedRoute>} />
            <Route path="/book" element={<ProtectedRoute requiredRoles={['customer']}><Booking /></ProtectedRoute>} />

            {/* Organiser Routes */}
            <Route
              path="/organiser"
              element={
                <ProtectedRoute requiredRoles={['organiser']}>
                  <Navigate to="/organiser/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer"
              element={
                <ProtectedRoute requiredRoles={['organiser']}>
                  <Navigate to="/organiser/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/dashboard"
              element={
                <ProtectedRoute requiredRoles={['organiser']}>
                  <Navigate to="/organiser/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route path="/organiser/dashboard" element={<ProtectedRoute requiredRoles={['organiser']}><OrganizerDashboard /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Navigate to="/admin/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'organiser') return <Navigate to="/organiser/dashboard" replace />;
    return <Navigate to="/customer/home" replace />;
  }

  return <Navigate to="/login" replace />;
}
