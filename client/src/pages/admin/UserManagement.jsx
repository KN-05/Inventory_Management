// src/pages/admin/UserManagement.jsx
// Admin-only: view all users, create new ones (Manager/Staff), activate/
// deactivate, and change roles. A user cannot change their own
// status/role (enforced on the backend too - see adminController.js).

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getUsers, createUser, updateUserStatus, updateUserRole } from '../../api/admin';
import { roleLabel } from '../../utils/roleLabel';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import CreateUserForm from './CreateUserForm';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

function UserManagement() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');

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

  return (
    <div className="page">
      <div className="page-header">
        <h1>User Management</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + Create User
        </Button>
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      {loading ? (
        <Loader label="Loading users..." />
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
            {users.map((u, index) => {
              const isSelf = u._id === currentUser?.id;
              return (
                <motion.tr
                  key={u._id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.22,
                    ease: [0.16, 1, 0.3, 1],
                    delay: Math.min(index, 8) * 0.03,
                  }}
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
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Accountant/Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={u.isActive ? 'badge badge-green' : 'badge badge-red'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-link"
                      disabled={isSelf}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      )}

      <CreateUserForm
        open={createOpen}
        onSubmit={handleCreateUser}
        onCancel={() => setCreateOpen(false)}
        error={createError}
      />
    </div>
  );
}

export default UserManagement;
