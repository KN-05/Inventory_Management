// src/components/layout/Navbar.jsx
// Top bar shown alongside the Sidebar. Shows who's logged in (with their
// profile photo, if set) and a hamburger button to open the Sidebar on
// mobile (see index.css for the responsive breakpoint).
//
// PHASE 18: added a functional global product search (navigates to
// /products?search=... - Products.jsx reads that query param on mount,
// see that file) to match the reference design's topbar search. Name/role
// text was removed from here since the Sidebar's new bottom user card
// (Phase 18) already shows both - keeping a compact avatar + logout here
// avoids showing the same two facts twice on screen.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import Button from '../common/Button';
import NotificationBell from './NotificationBell';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

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

      <div className="navbar-user">
        <div className="navbar-avatar">
          {user?.photo ? (
            <img src={`${API_ORIGIN}${user.photo}`} alt="" />
          ) : (
            <span>{user?.name?.[0]?.toUpperCase() || '?'}</span>
          )}
        </div>
        <Button variant="secondary" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}

export default Navbar;

