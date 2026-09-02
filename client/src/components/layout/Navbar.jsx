// src/components/layout/Navbar.jsx
// Top bar shown alongside the Sidebar. Shows who's logged in (with their
// profile photo, if set) and a hamburger button to open the Sidebar on
// mobile (see index.css for the responsive breakpoint).

import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleLabel';
import Button from '../common/Button';
import NotificationBell from './NotificationBell';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <button className="navbar-menu-btn" aria-label="Open menu" onClick={onMenuClick}>
        <span />
        <span />
        <span />
      </button>

      <div className="navbar-spacer" />

      <NotificationBell />

      <div className="navbar-user">
        <div className="navbar-avatar">
          {user?.photo ? (
            <img src={`${API_ORIGIN}${user.photo}`} alt="" />
          ) : (
            <span>{user?.name?.[0]?.toUpperCase() || '?'}</span>
          )}
        </div>
        <span className="navbar-user-name">{user?.name}</span>
        <span className="navbar-user-role">{roleLabel(user?.role)}</span>
        <Button variant="secondary" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}

export default Navbar;
