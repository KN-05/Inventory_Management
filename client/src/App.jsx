// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import RoleRoute from './components/common/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';

import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import StockAlerts from './pages/StockAlerts';
import UserManagement from './pages/admin/UserManagement';
import StaffPasswords from './pages/admin/StaffPasswords';
import Reports from './pages/admin/Reports';
import Analytics from './pages/admin/Analytics';
import ActivityLogs from './pages/admin/ActivityLogs';
import Settings from './pages/admin/Settings';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* PHASE 16: new landing/starting page - the first thing users
                see at "/". Purely informational; the existing "Login"
                route/component/logic below is completely unchanged. */}
            <Route path="/" element={<LandingPage />} />

            {/* Public routes */}
            {/* PHASE 16: /login is now wrapped in PublicRoute so an
                already-authenticated user who opens /login is redirected
                straight to /dashboard instead of seeing the form again.
                Register/ForgotPassword/ResetPassword are untouched. */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected routes - all share the Sidebar + Navbar shell */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/suppliers" element={<Suppliers />} />
              {/* PHASE 7: Purchases - Admin + Manager only, no PURCHASES_*
                  permission is granted to Staff in config/permissions.js */}
              <Route
                path="/purchases"
                element={
                  <RoleRoute allowedRoles={['admin', 'manager']}>
                    <Purchases />
                  </RoleRoute>
                }
              />
              <Route path="/alerts" element={<StockAlerts />} />
              {/* PHASE 8: Customers + Sales - Admin, Manager, AND Staff all
                  get these per the spec's Staff Allowed list ("Customer
                  creation/view", "Sales", "Basic billing"); no RoleRoute
                  wrapper needed, permission-gating happens inside the
                  pages/API for the specific actions (edit/delete/cancel). */}
              <Route path="/customers" element={<Customers />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/profile" element={<Profile />} />

              {/* Admin-only route */}
              <Route
                path="/admin/users"
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <UserManagement />
                  </RoleRoute>
                }
              />

              {/* PHASE 26: Admin + Manager - a restricted view that only
                  lists Staff accounts and only offers "Reset Password"
                  (OTP emailed to the Staff member's own email). Manager
                  does NOT get the full /admin/users page above. */}
              <Route
                path="/admin/staff-passwords"
                element={
                  <RoleRoute allowedRoles={['admin', 'manager']}>
                    <StaffPasswords />
                  </RoleRoute>
                }
              />

              {/* PHASE 2: Reports is now Admin + Manager (Accountant/Manager
                  has reporting access per the spec), not Admin-only. */}
              <Route
                path="/admin/reports"
                element={
                  <RoleRoute allowedRoles={['admin', 'manager']}>
                    <Reports />
                  </RoleRoute>
                }
              />

              {/* PHASE 10: Analytics - separate page from Reports, same
                  Admin + Manager access (per ANALYTICS_VIEW). */}
              <Route
                path="/admin/analytics"
                element={
                  <RoleRoute allowedRoles={['admin', 'manager']}>
                    <Analytics />
                  </RoleRoute>
                }
              />

              {/* PHASE 3: Admin-only Activity Logs + Settings */}
              <Route
                path="/admin/activity-logs"
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <ActivityLogs />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <Settings />
                  </RoleRoute>
                }
              />
            </Route>

            {/* Catch-all: unknown paths go to dashboard - ProtectedRoute
                bounces unauthenticated users on to /login from there,
                exactly as it did before this change. */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
