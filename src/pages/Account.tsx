import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth';
import { extractApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Account() {
  const { user, updateUser } = useAuth();
  const isCustomer = user?.role === 'user';

  // --- Profile form ---
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    surname: user?.surname || '',
    email: user?.email || '',
    nin: user?.nin || '',
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (!profile.firstName.trim()) return setProfileError('First name is required');
    if (!profile.surname.trim()) return setProfileError('Surname is required');
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) return setProfileError('Enter a valid email');
    if (isCustomer && !/^\d{11}$/.test(profile.nin)) {
      return setProfileError('NIN must be 11 digits');
    }

    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        firstName: profile.firstName.trim(),
        surname: profile.surname.trim(),
        email: profile.email.trim().toLowerCase(),
        ...(isCustomer ? { nin: profile.nin } : {}),
      });
      updateUser(updated);
      setProfile({
        firstName: updated.firstName,
        surname: updated.surname,
        email: updated.email,
        nin: updated.nin || '',
      });
      toast.success('Profile updated');
    } catch (err) {
      setProfileError(extractApiError(err, 'Could not update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Password form ---
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
          Signed in as <strong>{user?.firstName} {user?.surname}</strong> ({user?.email})
          {user && user.role !== 'user' && (
            <> — role: <strong>{user.role}</strong></>
          )}
          .
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Your details</h2>
        <p>Update your personal information. These details are used on your loan applications.</p>
        {profileError && <div className="alert alert-error">{profileError}</div>}
        <form onSubmit={handleProfileSave} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="surname">Surname</label>
              <input
                id="surname"
                value={profile.surname}
                onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          {isCustomer && (
            <div className="form-group">
              <label htmlFor="nin">NIN (11 digits)</label>
              <input
                id="nin"
                inputMode="numeric"
                maxLength={11}
                value={profile.nin}
                onChange={(e) =>
                  setProfile({ ...profile, nin: e.target.value.replace(/\D/g, '').slice(0, 11) })
                }
              />
            </div>
          )}
          <button type="submit" className="btn" disabled={savingProfile}>
            {savingProfile ? <span className="spinner" /> : 'Save changes'}
          </button>
        </form>
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
