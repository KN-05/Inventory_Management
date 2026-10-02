// src/components/layout/Navbar.jsx
// Top bar shown alongside the Sidebar. Shows who's logged in (with their
// profile photo, if set) and a hamburger button to open the Sidebar on
// mobile (see index.css for the responsive breakpoint).
//
// PHASE 18: added a functional global product search (navigates to
// /products?search=... - Products.jsx reads that query param on mount,
// see that file) to match the reference design's topbar search.
//
// PHASE 33: the bare avatar+Logout button is now a proper profile
// dropdown (click the avatar) showing the name, role, a Profile link,
// and Logout - matching the "Profile dropdown" item from the redesign
// brief. Uses the exact same open/close-on-outside-click pattern as
// NotificationBell for consistency.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { roleLabel } from '../../utils/roleLabel';
import NotificationBell from './NotificationBell';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = search.trim();
    navigate(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : '/products');
  };

  return (
    <header className="navbar">
      <button className="navbar-menu-btn" aria-label="Open menu" onClick={onMenuClick}>
        <span />
        <span />
        <span />
      </button>

      <form className="navbar-search" onSubmit={handleSearchSubmit} role="search">
        <span className="navbar-search-icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
        />
      </form>

      <div className="navbar-spacer" />

      <NotificationBell />

      <div className="navbar-profile-container" ref={profileRef}>
        <button
          type="button"
          className="navbar-profile-btn"
          onClick={() => setProfileOpen((prev) => !prev)}
          aria-haspopup="true"
          aria-expanded={profileOpen}
        >
          <div className="navbar-avatar">
            {user?.photo ? (
              <img src={`${API_ORIGIN}${user.photo}`} alt="" />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          <span className="navbar-profile-name-wrap">
            <span className="navbar-user-name">{user?.name}</span>
          </span>
          <span className="navbar-profile-chevron" aria-hidden="true">
            ▾
          </span>
        </button>

        {profileOpen && (
          <div className="navbar-profile-dropdown">
            <div className="navbar-profile-dropdown-header">
              <div className="navbar-avatar">
                {user?.photo ? (
                  <img src={`${API_ORIGIN}${user.photo}`} alt="" />
                ) : (
                  <span>{user?.name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              <div>
                <p className="navbar-profile-dropdown-name">{user?.name}</p>
                <p className="navbar-profile-dropdown-role">{roleLabel(user?.role)}</p>
              </div>
            </div>
            <a
              className="navbar-profile-dropdown-link"
              href="/profile"
              onClick={(e) => {
                e.preventDefault();
                setProfileOpen(false);
                navigate('/profile');
              }}
            >
              👤 Profile
            </a>
            <button type="button" className="navbar-profile-dropdown-logout" onClick={logout}>
              ⏻ Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
