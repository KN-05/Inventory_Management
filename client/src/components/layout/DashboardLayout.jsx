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

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { getAlerts } from '../../api/alerts';
import { useAuth } from '../../context/AuthContext';

function DashboardLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // Fetched once when the layout mounts (i.e. after login), so the Stock
  // Alerts badge is visible from any page, not just the Dashboard.
  useEffect(() => {
    getAlerts('active')
      .then((data) => setActiveAlertsCount(data.alerts.length))
      .catch(() => {
        /* silently ignore - badge just won't show a count */
      });
  }, []);

  return (
    <div className="app-shell" data-theme={user?.role || 'admin'}>
      <Sidebar
        activeAlertsCount={activeAlertsCount}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
