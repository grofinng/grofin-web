import { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute, StaffRoute } from './components/AdminRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Apply } from './pages/Apply';
import { Applications } from './pages/Applications';
import { Admin } from './pages/Admin';
import { AdminUsers } from './pages/AdminUsers';
import { AdminVendors } from './pages/AdminVendors';
import { AdminVendorRequests } from './pages/AdminVendorRequests';
import { AdminImpactStats } from './pages/AdminImpactStats';
import { Account } from './pages/Account';
import { Contact } from './pages/Contact';
import { Partner } from './pages/Partner';
import { EndUserTerms } from './pages/EndUserTerms';
import { PartnerTerms } from './pages/PartnerTerms';

function GuestOnly({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  return <Navigate to={user.role === 'user' ? '/dashboard' : '/admin'} replace />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/terms" element={<EndUserTerms />} />
          <Route path="/partner-terms" element={<PartnerTerms />} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute>
                <Apply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply/:id"
            element={
              <ProtectedRoute>
                <Apply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <Applications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <StaffRoute>
                <Admin />
              </StaffRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/vendors"
            element={
              <AdminRoute>
                <AdminVendors />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/vendor-requests"
            element={
              <AdminRoute>
                <AdminVendorRequests />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/stats"
            element={
              <AdminRoute>
                <AdminImpactStats />
              </AdminRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            success: { style: { background: '#1f6b3f', color: '#fff' } },
            error: { style: { background: '#c0392b', color: '#fff' } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
