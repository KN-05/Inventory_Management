// src/components/layout/DashboardLayout.jsx
// The shared shell for every protected page: Sidebar + Navbar + whichever
// page is active (rendered via React Router's <Outlet />). Replaces the
// old approach where each page rendered its own inline nav links.
//
// PHASE 1 (UI Foundation): also sets `data-theme` on the shell based on the
// logged-in user's role, so each role gets its own colour identity
// (Admin = blue/indigo, Manager = teal/green, Staff = orange/amber) while
// every other style (spacing, typography, layout) stays identical - see
// the `[data-theme="..."]` blocks in index.css. The 'manager' role doesn't
// exist in the database yet (that's Phase 2's job per the roadmap), but
// the theme is ready and will apply automatically once it does.
//
// PHASE 33: added a desktop-only sidebar collapse toggle. The preference
// is remembered in localStorage (purely a per-browser UI convenience, not
// business data) so it survives a refresh/new tab. Mobile's hamburger +
// slide-over drawer behaviour (sidebarOpen) is completely separate and
// unaffected.

import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Loader from '../common/Loader';
import ErrorBoundary from '../common/ErrorBoundary';
import { getAlerts } from '../../api/alerts';
import { useAuth } from '../../context/useAuth';

const COLLAPSE_STORAGE_KEY = 'im_sidebar_collapsed';

function DashboardLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Loaded after login AND again whenever the user moves to another page, so
  // the Stock Alerts badge stays correct after alerts are resolved or created
  // by a sale/purchase (one small request per navigation, no polling).
  useEffect(() => {
    getAlerts('active')
      .then((data) => setActiveAlertsCount(data.alerts.length))
      .catch(() => {
        /* silently ignore - badge just won't show a count */
      });
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        /* localStorage unavailable (private browsing etc) - preference
           just won't persist across reloads, no functional impact. */
      }
      return next;
    });
  };

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`} data-theme={user?.role || 'admin'}>
      <Sidebar
        activeAlertsCount={activeAlertsCount}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />
      <div className="app-main">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-content">
          {/* Pages load on demand (see App.jsx). This boundary keeps the sidebar
              and navbar on screen while a page's code is still downloading. */}
          {/* resetKey: a crashed page recovers as soon as the user opens another one */}
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<Loader label="Loading..." />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
