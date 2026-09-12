// src/components/layout/Sidebar.jsx
// Persistent left navigation, shown on every protected page. Highlights
// the active route and shows Admin/Manager-specific links based on role.
// PHASE 2: 3 roles now - User Management is Admin-only; Reports is
// Admin + Manager (Accountant/Manager has reporting access per the spec).
//
// PHASE 18: added a small icon per link and a bottom user profile card
// (avatar/name/role + logout) to match the reference design - purely
// visual/structural, every route/permission check above is unchanged.

import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/useAuth';
import { roleLabel } from '../../utils/roleLabel';

const navLinkClass = ({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link-active' : '');

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

// Wrapping NavLink lets it keep its routing behaviour (active state,
// navigation) while gaining Framer Motion's whileHover animation.
const MotionNavLink = motion.create(NavLink);

function SidebarLink({ to, icon, onClick, children }) {
  return (
    <MotionNavLink to={to} className={navLinkClass} onClick={onClick} whileHover={{ x: 2 }}>
      <span className="sidebar-link-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
    </MotionNavLink>
  );
}

function Sidebar({ activeAlertsCount = 0, open, onClose }) {
  const { user, isAdmin, isManager, logout } = useAuth();

  return (
    <>
      {/* Dimmed backdrop on mobile when the sidebar is open */}
      {open && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">IM</span>
          <span className="sidebar-brand-text">Inventory Manager</span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Overview</p>
          <SidebarLink to="/dashboard" icon="🏠" onClick={onClose}>
            Dashboard
          </SidebarLink>

          <p className="sidebar-section-label">Inventory</p>
          <SidebarLink to="/products" icon="📦" onClick={onClose}>
            Products
          </SidebarLink>
          <SidebarLink to="/categories" icon="🗂️" onClick={onClose}>
            Categories
          </SidebarLink>
          <SidebarLink to="/suppliers" icon="🚚" onClick={onClose}>
            Suppliers
          </SidebarLink>
          {/* PHASE 7: Purchases - Admin + Manager only, matching the
              spec's sidebar layout (Staff's sidebar has no Purchases link) */}
          {(isAdmin || isManager) && (
            <SidebarLink to="/purchases" icon="🧾" onClick={onClose}>
              Purchases
            </SidebarLink>
          )}
          <SidebarLink to="/alerts" icon="⚠️" onClick={onClose}>
            Stock Alerts
            {activeAlertsCount > 0 && <span className="nav-badge">{activeAlertsCount}</span>}
          </SidebarLink>

          {/* PHASE 8: Sales, Billing, Customers - ALL three roles get
              these per the spec's sidebar layout (Staff's sidebar
              explicitly includes "Sales", "Billing", "Customers" too). */}
          <p className="sidebar-section-label">Sales</p>
          <SidebarLink to="/sales" icon="💰" onClick={onClose}>
            Sales / Billing
          </SidebarLink>
          <SidebarLink to="/customers" icon="🙍" onClick={onClose}>
            Customers
          </SidebarLink>

          {(isAdmin || isManager) && (
            <>
              <p className="sidebar-section-label">{isAdmin ? 'Admin' : 'Management'}</p>
              {isAdmin && (
                <SidebarLink to="/admin/users" icon="👥" onClick={onClose}>
                  User Management
                </SidebarLink>
              )}
              <SidebarLink to="/admin/reports" icon="📄" onClick={onClose}>
                Reports
              </SidebarLink>
              {/* PHASE 10: Analytics - Admin + Manager, matching the spec's
                  sidebar having both "Reports" and "Analytics" separately. */}
              <SidebarLink to="/admin/analytics" icon="📈" onClick={onClose}>
                Analytics
              </SidebarLink>
              {isAdmin && (
                <>
                  <SidebarLink to="/admin/activity-logs" icon="🕒" onClick={onClose}>
                    Activity Logs
                  </SidebarLink>
                  <SidebarLink to="/admin/settings" icon="⚙️" onClick={onClose}>
                    Settings
                  </SidebarLink>
                </>
              )}
            </>
          )}

          <p className="sidebar-section-label">Account</p>
          <SidebarLink to="/profile" icon="👤" onClick={onClose}>
            Profile
          </SidebarLink>
        </nav>

        {/* PHASE 18: bottom user card, matching the reference design.
            Reuses the exact same user/logout the Navbar already uses -
            no new auth logic. */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {user?.photo ? (
              <img src={`${API_ORIGIN}${user.photo}`} alt="" />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{roleLabel(user?.role)}</span>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            aria-label="Logout"
            title="Logout"
          >
            ⏻
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

