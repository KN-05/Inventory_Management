// src/pages/admin/UserManagement.jsx
// PHASE 34: now shared by Admin AND Manager, with different powers:
//   Admin   - everything: create users, change roles, activate/deactivate,
//             reset passwords, and permanently delete accounts.
//   Manager - view the list and activate/deactivate Staff/Manager accounts
//             only (never an Admin account). No create, role change,
//             password reset, or delete - the controls simply aren't shown,
//             and the backend rejects those calls for Manager anyway.
// A user can never change their own status/role or delete themselves
// (enforced on the backend too - see adminController.js).

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../context/useToast';
import {
  getUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
  adminResetPassword,
  deleteUser,
} from '../../api/admin';
import { roleLabel } from '../../utils/roleLabel';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatCard from '../../components/dashboard/StatCard';
import AnimatedModal from '../../components/common/AnimatedModal';
import CreateUserForm from './CreateUserForm';
import { Search, UserCheck, UserX, Users } from 'lucide-react';
import { ICON_SM } from '../../utils/iconProps';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

const roleBadgeClass = {
  admin: 'badge badge-red',
  manager: 'badge badge-blue',
  staff: 'badge badge-yellow',
};

function UserManagement() {
  const { user: currentUser, isAdmin } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');

  // Admin directly resets any other user's password - no OTP, since the
  // Admin doing this is already fully authenticated.
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  // PHASE 34: Admin-only permanent delete, behind a confirm dialog.
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getUsers();
      setUsers(data.users);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
    }),
    [users]
  );

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  const handleCreateUser = async (formData) => {
    setCreateError('');
    try {
      await createUser(formData);
      toast.success(`${formData.name} created as ${roleLabel(formData.role)}`);
      setCreateOpen(false);
      loadUsers();
    } catch (err) {
      const data = err.response?.data;
      setCreateError(
        data?.errors?.map((e) => e.message).join(', ') || data?.message || 'Failed to create user'
      );
    }
  };

  const handleToggleStatus = async (targetUser) => {
    try {
      await updateUserStatus(targetUser._id, !targetUser.isActive);
      toast.success(`${targetUser.name} ${targetUser.isActive ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (newRole === targetUser.role) return;
    try {
      await updateUserRole(targetUser._id, newRole);
      toast.success(`${targetUser.name}'s role changed to ${roleLabel(newRole)}`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteUser(target._id);
      toast.success(`${target.name} deleted`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openResetPassword = (targetUser) => {
    setResetTarget(targetUser);
    setResetPassword('');
    setResetError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetting(true);
    try {
      await adminResetPassword(resetTarget._id, resetPassword);
      toast.success(`Password reset for ${resetTarget.name}`);
      setResetTarget(null);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="User Management"
        subtitle={
          isAdmin
            ? 'Create accounts, assign roles, and control who can sign in'
            : 'Activate or deactivate Staff and Manager accounts'
        }
        actions={
          isAdmin && (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              + Create User
            </Button>
          )
        }
      />

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard icon={<Users {...ICON_SM} />} label="Total Users" value={summary.total} tone="default" index={0} />
        <StatCard icon={<UserCheck {...ICON_SM} />} label="Active" value={summary.active} tone="success" index={1} />
        <StatCard icon={<UserX {...ICON_SM} />} label="Deactivated" value={summary.inactive} tone="danger" index={2} />
      </div>

      <div className="filters-bar">
        <div className="filters-search-wrap">
          <span className="filters-search-icon" aria-hidden="true">
            <Search {...ICON_SM} />
          </span>
          <input
            type="text"
            className="filters-search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Accountant/Manager</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {loading ? (
        <Loader label="Loading users..." />
      ) : visibleUsers.length === 0 ? (
        <p className="empty-state">No users match your search.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => {
              const isSelf = u._id === currentUser?.id;
              // Manager can never touch an Admin account's status.
              const canToggleStatus = !isSelf && (isAdmin || u.role !== 'admin');
              return (
                <tr
                  key={u._id}
                >
                  <td>
                    <div className="table-avatar">
                      {u.photo ? (
                        <img src={`${API_ORIGIN}${u.photo}`} alt="" />
                      ) : (
                        <span>{u.name?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {u.name} {isSelf && <span className="you-tag">(you)</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {isAdmin ? (
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Accountant/Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={roleBadgeClass[u.role] || 'badge'}>{roleLabel(u.role)}</span>
                    )}
                  </td>
                  <td>
                    <span className={u.isActive ? 'badge badge-green' : 'badge badge-red'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-link"
                      disabled={!canToggleStatus}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {isAdmin && !isSelf && (
                      <button className="btn-link" onClick={() => openResetPassword(u)}>
                        Reset Password
                      </button>
                    )}
                    {isAdmin && !isSelf && (
                      <button className="btn-link btn-link-danger" onClick={() => setDeleteTarget(u)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {isAdmin && (
        <CreateUserForm
          open={createOpen}
          onSubmit={handleCreateUser}
          onCancel={() => setCreateOpen(false)}
          error={createError}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this user?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" (${deleteTarget.email}) will be permanently removed and can no longer sign in. This cannot be undone. If you only want to block access for now, use Deactivate instead.`
            : ''
        }
        confirmLabel="Delete User"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Admin's direct "Reset Password" - no OTP step, since only an
          already-authenticated Admin can reach this action. Manager -> Staff
          resets go through the separate OTP-gated flow on the Staff
          Passwords page instead (see StaffPasswords.jsx). */}
      <AnimatedModal open={!!resetTarget} onClose={() => setResetTarget(null)} maxWidth={380}>
        <h2>Reset password for {resetTarget?.name}</h2>
        <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
          Set a new password for this account. They'll need to use it the next time they log in.
        </p>
        <form onSubmit={handleResetPassword}>
          {resetError && <p className="form-error">{resetError}</p>}
          <div className="form-row">
            <div>
              <label htmlFor="reset-password-input">New password</label>
              <input
                id="reset-password-input"
                type="password"
                autoFocus
                minLength={6}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" type="button" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </AnimatedModal>
    </div>
  );
}

export default UserManagement;
