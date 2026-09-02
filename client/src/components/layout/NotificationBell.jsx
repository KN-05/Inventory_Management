// src/components/layout/NotificationBell.jsx
// PHASE 3: navbar notification icon + unread count + dropdown list.
// Polls the unread count every 30s so the badge stays reasonably fresh
// without needing websockets (out of scope for this project's stack).

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../api/notifications';

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const refreshCount = () => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close the dropdown when clicking outside it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setLoading(true);
      try {
        const data = await getNotifications();
        setNotifications(data.notifications);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleItemClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
      );
      refreshCount();
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="notif-bell-container" ref={containerRef}>
      <button className="notif-bell-btn" onClick={handleToggle} aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="notif-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <div className="notif-dropdown-header">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <button className="btn-link" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <p className="loader" style={{ padding: '1rem' }}>
                Loading...
              </p>
            ) : notifications.length === 0 ? (
              <p className="empty-state" style={{ margin: '0.5rem' }}>
                No notifications yet.
              </p>
            ) : (
              <div className="notif-list">
                {notifications.map((n) => (
                  <Link
                    key={n._id}
                    to={n.link || '#'}
                    className={`notif-item ${n.isRead ? '' : 'notif-item-unread'}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <p className="notif-item-message">{n.message}</p>
                    <p className="notif-item-time">{timeAgo(n.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
