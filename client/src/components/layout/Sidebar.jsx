// src/components/layout/Sidebar.jsx
// Persistent left navigation on every protected page. Highlights the
// active route and shows Admin/Manager links based on role.
//
// Icons are lucide-react, drawn through the shared ICON props so every
// icon has the same size and stroke weight. Hover feedback is a plain CSS
// background change (no sliding animation).
//
// Desktop: can be collapsed to an icon-only rail (link text gets its own
// <span className="sidebar-link-text"> so CSS can hide just the text; each
// link keeps a title tooltip). Mobile: the same markup is a slide-over
// drawer opened from the navbar's menu button - see AppStyles.jsx.
//
// Routes and role checks are unchanged: Purchases and the Admin/Management
// group are Admin + Manager; Activity Logs and Settings are Admin only.

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Package,
  Tags,
  Truck,
  ShoppingBag,
  CircleAlert,
  ShoppingCart,
  Users,
  UserCog,
  KeyRound,
  FileText,
  ChartNoAxesCombined,
  Lightbulb,
  History,
  Settings,
  UserRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { roleLabel } from '../../utils/roleLabel';
import { ICON } from '../../utils/iconProps';

const navLinkClass = ({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link-active' : '');

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

function SidebarLink({ to, icon: Icon, label, onClick, children }) {
  return (
    <NavLink to={to} className={navLinkClass} onClick={onClick} title={label}>
      <span className="sidebar-link-icon" aria-hidden="true">
        <Icon {...ICON} />
      </span>
      <span className="sidebar-link-text">{children}</span>
    </NavLink>
  );
}

function Sidebar({ activeAlertsCount = 0, open, onClose, collapsed = false, onToggleCollapse }) {
  const { user, isAdmin, isManager, logout } = useAuth();

  return (
    <>
      {/* Dimmed backdrop on mobile when the drawer is open */}
      {open && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        {/* Desktop-only collapse handle (hidden on mobile via CSS) */}
        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}
          </button>
        )}

        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">IM</span>
          {!collapsed && <span className="sidebar-brand-text">Inventory Manager</span>}
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Overview</p>
          <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onClose}>
            Dashboard
          </SidebarLink>
          {/* Every role gets this link; the page itself shows the right view
              (Admin = team view only). */}
          <SidebarLink to="/attendance" icon={CalendarCheck} label="Attendance" onClick={onClose}>
            Attendance
          </SidebarLink>

          <p className="sidebar-section-label">Inventory</p>
          <SidebarLink to="/products" icon={Package} label="Products" onClick={onClose}>
            Products
          </SidebarLink>
          <SidebarLink to="/categories" icon={Tags} label="Categories" onClick={onClose}>
            Categories
          </SidebarLink>
          <SidebarLink to="/suppliers" icon={Truck} label="Suppliers" onClick={onClose}>
            Suppliers
          </SidebarLink>
          {/* Purchases: Admin + Manager only (Staff's sidebar has no link) */}
          {(isAdmin || isManager) && (
            <SidebarLink to="/purchases" icon={ShoppingBag} label="Purchases" onClick={onClose}>
              Purchases
            </SidebarLink>
          )}
          <SidebarLink to="/alerts" icon={CircleAlert} label="Stock Alerts" onClick={onClose}>
            Stock Alerts
            {activeAlertsCount > 0 && <span className="nav-badge">{activeAlertsCount}</span>}
          </SidebarLink>

          <p className="sidebar-section-label">Sales</p>
          <SidebarLink to="/sales" icon={ShoppingCart} label="Sales / Billing" onClick={onClose}>
            Sales / Billing
          </SidebarLink>
          <SidebarLink to="/customers" icon={Users} label="Customers" onClick={onClose}>
            Customers
          </SidebarLink>

          {(isAdmin || isManager) && (
            <>
              <p className="sidebar-section-label">{isAdmin ? 'Admin' : 'Management'}</p>
              {/* Manager sees User Management too (view + activate/deactivate only) */}
              <SidebarLink to="/admin/users" icon={UserCog} label="User Management" onClick={onClose}>
                User Management
              </SidebarLink>
              <SidebarLink to="/admin/staff-passwords" icon={KeyRound} label="Staff Passwords" onClick={onClose}>
                Staff Passwords
              </SidebarLink>
              <SidebarLink to="/admin/reports" icon={FileText} label="Reports" onClick={onClose}>
                Reports
              </SidebarLink>
              <SidebarLink to="/admin/analytics" icon={ChartNoAxesCombined} label="Analytics" onClick={onClose}>
                Analytics
              </SidebarLink>
              <SidebarLink to="/admin/ai-insights" icon={Lightbulb} label="AI Insights" onClick={onClose}>
                AI Insights
              </SidebarLink>
              {isAdmin && (
                <>
                  <SidebarLink to="/admin/activity-logs" icon={History} label="Activity Logs" onClick={onClose}>
                    Activity Logs
                  </SidebarLink>
                  <SidebarLink to="/admin/settings" icon={Settings} label="Settings" onClick={onClose}>
                    Settings
                  </SidebarLink>
                </>
              )}
            </>
          )}

          <p className="sidebar-section-label">Account</p>
          <SidebarLink to="/profile" icon={UserRound} label="Profile" onClick={onClose}>
            Profile
          </SidebarLink>
        </nav>

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
            <button type="button" className="sidebar-logout-btn" onClick={logout} aria-label="Log out" title="Log out">
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
