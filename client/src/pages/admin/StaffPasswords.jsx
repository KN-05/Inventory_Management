// src/pages/admin/StaffPasswords.jsx
// PHASE 26: lets a Manager reset a Staff member's password WITHOUT
// giving the Manager access to the full Admin User Management page
// (role changes, activate/deactivate, or seeing Admins/other Managers) -
// this page only ever lists Staff accounts (GET /admin/staff-list) and
// only ever offers one action: reset password.
//
// Flow: click "Reset Password" -> Step 1 sends a 6-digit OTP to that
// Staff member's OWN registered email (never the Manager's or an
// Admin's - see server/controllers/adminController.js) -> Step 2 the
// Manager enters the OTP (the Staff member reads it from their own
// inbox and tells the Manager) plus the new password -> confirmed.
//
// Admin can also open this page (it's harmless for them too - Admin
// already has a no-OTP "Reset Password" directly on the User Management
// page), so no need for two different UIs there.

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../context/useToast';
import { getStaffList, requestStaffPasswordResetOtp, resetStaffPasswordWithOtp } from '../../api/admin';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import AnimatedModal from '../../components/common/AnimatedModal';

function StaffPasswords() {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [target, setTarget] = useState(null); // staff member currently being reset
  const [step, setStep] = useState('idle'); // 'idle' | 'otp-sent'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setStaff(await getStaffList());
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const openFor = (staffMember) => {
    setTarget(staffMember);
    setStep('idle');
    setOtp('');
    setNewPassword('');
    setError('');
  };

  const closeModal = () => setTarget(null);

  const handleSendOtp = async () => {
    setError('');
    setSending(true);
    try {
      const data = await requestStaffPasswordResetOtp(target._id);
      toast.success(data.message);
      setStep('otp-sent');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setConfirming(true);
    try {
      await resetStaffPasswordWithOtp(target._id, otp, newPassword);
      toast.success(`Password reset for ${target.name}`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Staff Passwords</h1>
          <p className="page-subtitle">
            Reset a Staff member's password. A verification code is emailed to their own account -
            you'll need it from them to complete the reset.
          </p>
        </div>
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      {loading ? (
        <Loader label="Loading staff..." />
      ) : staff.length === 0 ? (
        <p className="empty-state">No Staff accounts yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s, index) => (
              <motion.tr
                key={s._id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.03 }}
              >
                <td>
                  <span className="cell-with-avatar">
                    <span className="table-avatar">{s.name?.[0]?.toUpperCase() || '?'}</span>
                    {s.name}
                  </span>
                </td>
                <td>{s.email}</td>
                <td>
                  <span className={s.isActive ? 'badge badge-green' : 'badge badge-red'}>
                    {s.isActive ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td>
                  <button className="btn-link" onClick={() => openFor(s)}>
                    Reset Password
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}

      <AnimatedModal open={!!target} onClose={closeModal} maxWidth={420}>
        <h2>Reset password for {target?.name}</h2>

        {step === 'idle' && (
          <>
            <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
              A 6-digit verification code will be emailed to <strong>{target?.email}</strong>. Ask{' '}
              {target?.name} for the code once they receive it.
            </p>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleSendOtp} disabled={sending}>
                {sending ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </div>
          </>
        )}

        {step === 'otp-sent' && (
          <form onSubmit={handleConfirm}>
            <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
              Enter the code {target?.name} received at {target?.email}, and their new password.
            </p>
            {error && <p className="form-error">{error}</p>}
            <div className="form-row">
              <div>
                <label htmlFor="staff-otp-input">Verification code</label>
                <input
                  id="staff-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  required
                />
              </div>
              <div>
                <label htmlFor="staff-new-password-input">New password</label>
                <input
                  id="staff-new-password-input"
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="secondary" type="button" onClick={handleSendOtp} disabled={sending}>
                Resend Code
              </Button>
              <Button variant="primary" type="submit" disabled={confirming}>
                {confirming ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </div>
          </form>
        )}
      </AnimatedModal>
    </div>
  );
}

export default StaffPasswords;
