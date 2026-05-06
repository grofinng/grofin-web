import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { extractApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Account() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentPassword || !newPassword || !confirm) {
      return setError('All fields are required');
    }
    if (newPassword.length < 6) {
      return setError('New password must be at least 6 characters');
    }
    if (newPassword !== confirm) {
      return setError('New passwords do not match');
    }
    if (newPassword === currentPassword) {
      return setError('New password must be different from the current one');
    }

    setSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(extractApiError(err, 'Could not update password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-sm page">
      <div className="page-title" style={{ marginBottom: '1rem' }}>
        <h1>Account</h1>
        <p>
          Signed in as <strong>{user?.firstName} {user?.surname}</strong> ({user?.email}) — role:{' '}
          <strong>{user?.role}</strong>.
        </p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem' }}>Change password</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <span className="field-help">At least 6 characters</span>
            </div>
            <div className="form-group">
              <label htmlFor="confirm">Confirm new password</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
