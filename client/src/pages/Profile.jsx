// src/pages/Profile.jsx
// Lets any logged-in user (Admin, Manager, or Staff) view/edit their own
// name, email, phone, and photo, and change their password.

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { roleLabel } from '../utils/roleLabel';
import { getProfile, updateProfile, changePassword, uploadPhoto } from '../api/profile';
import { API_ORIGIN } from '../api/axiosInstance';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';

function Profile() {
  const { updateStoredUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  // Profile details form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data.user);
        setName(data.user.name);
        setEmail(data.user.email);
        setPhone(data.user.phone || '');
      })
      .catch((err) => setLoadError(err.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const data = await uploadPhoto(file);
      const updatedProfile = { ...profile, photo: data.photo };
      setProfile(updatedProfile);
      updateStoredUser(updatedProfile);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      e.target.value = ''; // allow re-selecting the same file later
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaving(true);
    try {
      const data = await updateProfile({ name, email, phone });
      setProfile(data.user);
      updateStoredUser(data.user); // keep Dashboard greeting, etc. in sync
      toast.success('Profile updated successfully');
    } catch (err) {
      const respData = err.response?.data;
      const text =
        respData?.errors?.map((e2) => e2.message).join(', ') ||
        respData?.message ||
        'Failed to update profile';
      setProfileError(text);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const respData = err.response?.data;
      const text =
        respData?.errors?.map((e2) => e2.message).join(', ') ||
        respData?.message ||
        'Failed to change password';
      setPasswordError(text);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Loader label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profile</h1>
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      {/* --- Photo + quick info --- */}
      <div className="chart-card profile-header-card">
        <div
          className="profile-photo"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          {profile?.photo ? (
            <img src={`${API_ORIGIN}${profile.photo}`} alt="Profile" />
          ) : (
            <span>{profile?.name?.[0]?.toUpperCase() || '?'}</span>
          )}
          <div className="profile-photo-overlay">{photoUploading ? '...' : 'Change'}</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{profile?.name}</p>
          <p className="page-subtitle" style={{ margin: '0.2rem 0 0' }}>
            {roleLabel(profile?.role)}
          </p>
          {profile?.lastLogin && (
            <p className="page-subtitle" style={{ margin: '0.2rem 0 0', fontSize: '0.75rem' }}>
              Last login: {new Date(profile.lastLogin).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="charts-grid" style={{ marginTop: '1rem' }}>
        {/* --- Profile details --- */}
        <div className="chart-card">
          <h3>Account Details</h3>

          {profileError && <p className="banner banner-error">{profileError}</p>}

          <form className="modal-form" onSubmit={handleProfileSubmit}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />

            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />

            <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
              <Button variant="primary" type="submit" disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* --- Change password --- */}
        <div className="chart-card">
          <h3>Change Password</h3>

          {passwordError && <p className="banner banner-error">{passwordError}</p>}

          <form className="modal-form" onSubmit={handlePasswordSubmit}>
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />

            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />

            <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
              <Button variant="primary" type="submit" disabled={passwordSaving}>
                {passwordSaving ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
