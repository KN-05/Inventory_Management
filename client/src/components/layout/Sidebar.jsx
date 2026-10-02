// src/components/layout/Sidebar.jsx
// Persistent left navigation, shown on every protected page. Highlights
// the active route and shows Admin/Manager-specific links based on role.
// PHASE 2: 3 roles now - User Management is Admin-only; Reports is
// Admin + Manager (Accountant/Manager has reporting access per the spec).
//
// PHASE 18: added a small icon per link and a bottom user profile card
// (avatar/name/role + logout) to match the reference design - purely
// visual/structural, every route/permission check above is unchanged.
//
// PHASE 33: desktop-collapsible sidebar. Link text is now wrapped in its
// own <span className="sidebar-link-text"> (was a bare text node) so CSS
// can hide just the text while keeping icons centered when collapsed -
// see the "sidebar-collapsed" rules in AppStyles.jsx. A floating toggle
// handle sits on the sidebar's edge to flip the state; each link gets a
// native title tooltip so its purpose is still clear as an icon-only rail.
// Mobile behaviour (hamburger + slide-over drawer) is completely
// untouched - the collapse rules only apply at desktop widths.

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

function SidebarLink({ to, icon, label, onClick, children }) {
  return (
    <MotionNavLink to={to} className={navLinkClass} onClick={onClick} whileHover={{ x: 2 }} title={label}>
      <span className="sidebar-link-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="sidebar-link-text">{children}</span>
    </MotionNavLink>
  );
}

function Sidebar({ activeAlertsCount = 0, open, onClose, collapsed = false, onToggleCollapse }) {
  const { user, isAdmin, isManager, logout } = useAuth();

  return (
    <>
      {/* Dimmed backdrop on mobile when the sidebar is open */}
      {open && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        {/* PHASE 33: floating collapse/expand handle - desktop only (hidden
            on mobile via CSS, where the hamburger+drawer pattern is used
            instead). */}
        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        )}

        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">IM</span>
          {!collapsed && <span className="sidebar-brand-text">Inventory Manager</span>}
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Overview</p>
          <SidebarLink to="/dashboard" icon="🏠" label="Dashboard" onClick={onClose}>
            Dashboard
          </SidebarLink>

          <p className="sidebar-section-label">Inventory</p>
          <SidebarLink to="/products" icon="📦" label="Products" onClick={onClose}>
            Products
          </SidebarLink>
          <SidebarLink to="/categories" icon="🗂️" label="Categories" onClick={onClose}>
            Categories
          </SidebarLink>
          <SidebarLink to="/suppliers" icon="🚚" label="Suppliers" onClick={onClose}>
            Suppliers
          </SidebarLink>
          {/* PHASE 7: Purchases - Admin + Manager only, matching the
              spec's sidebar layout (Staff's sidebar has no Purchases link) */}
          {(isAdmin || isManager) && (
            <SidebarLink to="/purchases" icon="🧾" label="Purchases" onClick={onClose}>
              Purchases
            </SidebarLink>
          )}
          <SidebarLink to="/alerts" icon="⚠️" label="Stock Alerts" onClick={onClose}>
            Stock Alerts
            {activeAlertsCount > 0 && <span className="nav-badge">{activeAlertsCount}</span>}
          </SidebarLink>

          {/* PHASE 8: Sales, Billing, Customers - ALL three roles get
              these per the spec's sidebar layout (Staff's sidebar
              explicitly includes "Sales", "Billing", "Customers" too). */}
          <p className="sidebar-section-label">Sales</p>
          <SidebarLink to="/sales" icon="💰" label="Sales / Billing" onClick={onClose}>
            Sales / Billing
          </SidebarLink>
          <SidebarLink to="/customers" icon="🙍" label="Customers" onClick={onClose}>
            Customers
          </SidebarLink>

          {(isAdmin || isManager) && (
            <>
              <p className="sidebar-section-label">{isAdmin ? 'Admin' : 'Management'}</p>
              {isAdmin && (
                <SidebarLink to="/admin/users" icon="👥" label="User Management" onClick={onClose}>
                  User Management
                </SidebarLink>
              )}
              {/* PHASE 26: visible to Admin + Manager - restricted to
                  just Staff accounts + password reset, unlike the full
                  User Management page above. */}
              <SidebarLink to="/admin/staff-passwords" icon="🔑" label="Staff Passwords" onClick={onClose}>
                Staff Passwords
              </SidebarLink>
              <SidebarLink to="/admin/reports" icon="📄" label="Reports" onClick={onClose}>
                Reports
              </SidebarLink>
              {/* PHASE 10: Analytics - Admin + Manager, matching the spec's
                  sidebar having both "Reports" and "Analytics" separately. */}
              <SidebarLink to="/admin/analytics" icon="📈" label="Analytics" onClick={onClose}>
                Analytics
              </SidebarLink>
              {/* PHASE 28/29: AI Insights - same Admin + Manager access as
                  Analytics. */}
              <SidebarLink to="/admin/ai-insights" icon="🧠" label="AI Insights" onClick={onClose}>
                AI Insights
              </SidebarLink>
              {isAdmin && (
                <>
                  <SidebarLink to="/admin/activity-logs" icon="🕒" label="Activity Logs" onClick={onClose}>
                    Activity Logs
                  </SidebarLink>
                  <SidebarLink to="/admin/settings" icon="⚙️" label="Settings" onClick={onClose}>
                    Settings
                  </SidebarLink>
                </>
              )}
            </>
          )}

          <p className="sidebar-section-label">Account</p>
          <SidebarLink to="/profile" icon="👤" label="Profile" onClick={onClose}>
            Profile
          </SidebarLink>
        </nav>

        {/* PHASE 18: bottom user card, matching the reference design.
            Reuses the exact same user/logout the Navbar already uses -
            no new auth logic. */}
        <div className="sidebar-user-card" title={collapsed ? `${user?.name} (${roleLabel(user?.role)})` : undefined}>
          <div className="sidebar-user-avatar">
            {user?.photo ? (
              <img src={`${API_ORIGIN}${user.photo}`} alt="" />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{roleLabel(user?.role)}</span>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={logout}
              aria-label="Logout"
              title="Logout"
            >
              ⏻
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
