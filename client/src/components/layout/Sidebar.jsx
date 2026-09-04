// src/components/layout/Sidebar.jsx
// Persistent left navigation, shown on every protected page. Highlights
// the active route and shows Admin/Manager-specific links based on role.
// PHASE 2: 3 roles now - User Management is Admin-only; Reports is
// Admin + Manager (Accountant/Manager has reporting access per the spec).

import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const navLinkClass = ({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link-active' : '');

// Wrapping NavLink lets it keep its routing behaviour (active state,
// navigation) while gaining Framer Motion's whileHover animation.
const MotionNavLink = motion.create(NavLink);

function SidebarLink({ to, onClick, children }) {
  return (
    <MotionNavLink to={to} className={navLinkClass} onClick={onClick} whileHover={{ x: 2 }}>
      {children}
    </MotionNavLink>
  );
}

function Sidebar({ activeAlertsCount = 0, open, onClose }) {
  const { isAdmin, isManager } = useAuth();

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
          <SidebarLink to="/dashboard" onClick={onClose}>
            Dashboard
          </SidebarLink>

          <p className="sidebar-section-label">Inventory</p>
          <SidebarLink to="/products" onClick={onClose}>
            Products
          </SidebarLink>
          <SidebarLink to="/categories" onClick={onClose}>
            Categories
          </SidebarLink>
          <SidebarLink to="/suppliers" onClick={onClose}>
            Suppliers
          </SidebarLink>
          {/* PHASE 7: Purchases - Admin + Manager only, matching the
              spec's sidebar layout (Staff's sidebar has no Purchases link) */}
          {(isAdmin || isManager) && (
            <SidebarLink to="/purchases" onClick={onClose}>
              Purchases
            </SidebarLink>
          )}
          <SidebarLink to="/alerts" onClick={onClose}>
            Stock Alerts
            {activeAlertsCount > 0 && <span className="nav-badge">{activeAlertsCount}</span>}
          </SidebarLink>

          {/* PHASE 8: Sales, Billing, Customers - ALL three roles get
              these per the spec's sidebar layout (Staff's sidebar
              explicitly includes "Sales", "Billing", "Customers" too). */}
          <p className="sidebar-section-label">Sales</p>
          <SidebarLink to="/sales" onClick={onClose}>
            Sales / Billing
          </SidebarLink>
          <SidebarLink to="/customers" onClick={onClose}>
            Customers
          </SidebarLink>

          {(isAdmin || isManager) && (
            <>
              <p className="sidebar-section-label">{isAdmin ? 'Admin' : 'Management'}</p>
              {isAdmin && (
                <SidebarLink to="/admin/users" onClick={onClose}>
                  User Management
                </SidebarLink>
              )}
              <SidebarLink to="/admin/reports" onClick={onClose}>
                Reports
              </SidebarLink>
              {/* PHASE 10: Analytics - Admin + Manager, matching the spec's
                  sidebar having both "Reports" and "Analytics" separately. */}
              <SidebarLink to="/admin/analytics" onClick={onClose}>
                Analytics
              </SidebarLink>
              {isAdmin && (
                <>
                  <SidebarLink to="/admin/activity-logs" onClick={onClose}>
                    Activity Logs
                  </SidebarLink>
                  <SidebarLink to="/admin/settings" onClick={onClose}>
                    Settings
                  </SidebarLink>
                </>
              )}
            </>
          )}

          <p className="sidebar-section-label">Account</p>
          <SidebarLink to="/profile" onClick={onClose}>
            Profile
          </SidebarLink>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
