// src/App.jsx

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import RoleRoute from './components/common/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Loader from './components/common/Loader';
import ErrorBoundary from './components/common/ErrorBoundary';

// PERFORMANCE: every page is loaded on demand (code splitting). Before, the
// browser had to download the code for ALL pages - charts, admin screens, the
// landing page - before showing anything. Now it downloads only the page being
// opened; the rest arrive when the user navigates there.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Categories = lazy(() => import('./pages/Categories'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Customers = lazy(() => import('./pages/Customers'));
const Sales = lazy(() => import('./pages/Sales'));
const StockAlerts = lazy(() => import('./pages/StockAlerts'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const StaffPasswords = lazy(() => import('./pages/admin/StaffPasswords'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const AIInsights = lazy(() => import('./pages/admin/AIInsights'));
const ActivityLogs = lazy(() => import('./pages/admin/ActivityLogs'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const Attendance = lazy(() => import('./pages/Attendance'));


function App() {
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
          <Suspense fallback={<Loader label="Loading..." />}>
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

              {/* PHASE 34: Attendance - all three roles open this same page, but
                  each sees a different experience (Staff: own check-in/history,
                  Manager: own + team with edit, Admin: team, view only). The
                  backend enforces the real permissions per endpoint. */}
              <Route path="/attendance" element={<Attendance />} />

              {/* PHASE 34: Admin + Manager. Admin gets full control (create,
                  roles, delete, reset password); Manager can only view the
                  list and activate/deactivate - see UserManagement.jsx. */}
              <Route
                path="/admin/users"
                element={
                  <RoleRoute allowedRoles={['admin', 'manager']}>
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

              {/* PHASE 28/29: AI Insights - same Admin + Manager access as
                  Analytics (reorder suggestions, demand forecast, anomaly
                  detection, and the rule-based assistant). */}
              <Route
                path="/admin/ai-insights"
                element={
                  <RoleRoute allowedRoles={['admin', 'manager']}>
                    <AIInsights />
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
          </Suspense>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
    </MotionConfig>
  );
}

export default App;
