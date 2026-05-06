import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi } from '../api/users';
import { extractApiError } from '../api/client';
import { StaffUser, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

type StaffRole = Exclude<UserRole, 'user'>;

const ROLE_LABELS: Record<StaffRole, string> = {
  manager: 'Manager (read-only)',
  admin: 'Admin (full access)',
};

export function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    surname: '',
    email: '',
    password: '',
    role: 'manager' as StaffRole,
    receiveApplicationEmails: false,
  });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .list()
      .then((list) => !cancelled && setUsers(list))
      .catch((err) => !cancelled && setError(extractApiError(err, 'Could not load users')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setForm({
      firstName: '',
      surname: '',
      email: '',
      password: '',
      role: 'manager',
      receiveApplicationEmails: false,
    });
    setFormError(null);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.firstName.trim() || !form.surname.trim()) {
      return setFormError('First name and surname are required');
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return setFormError('Enter a valid email');
    }
    if (form.password.length < 6) {
      return setFormError('Password must be at least 6 characters');
    }
    setCreating(true);
    try {
      const created = await usersApi.create({
        firstName: form.firstName.trim(),
        surname: form.surname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        receiveApplicationEmails: form.receiveApplicationEmails,
      });
      setUsers((prev) => [created, ...prev]);
      toast.success(`${ROLE_LABELS[form.role].split(' ')[0]} created`);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(extractApiError(err, 'Could not create user'));
    } finally {
      setCreating(false);
    }
  };

  const toggleReceive = async (u: StaffUser) => {
    setTogglingId(u.id);
    try {
      const updated = await usersApi.update(u.id, {
        receiveApplicationEmails: !u.receiveApplicationEmails,
      });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(updated.receiveApplicationEmails ? 'Will receive emails' : 'Will not receive emails');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not update'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleRemove = async (u: StaffUser) => {
    if (!window.confirm(`Remove ${u.firstName} ${u.surname} (${u.email})?`)) return;
    setRemovingId(u.id);
    try {
      await usersApi.remove(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success('User removed');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not remove user'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>Admin · Team</h1>
          <p>Create managers and other admins. Managers can review applications but cannot approve them.</p>
        </div>
        <button type="button" className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add user'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>New user</h2>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreate} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="surname">Surname</label>
                <input
                  id="surname"
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Initial password</label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <span className="field-help">User can change it after sign-in</span>
              </div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                >
                  <option value="manager">{ROLE_LABELS.manager}</option>
                  <option value="admin">{ROLE_LABELS.admin}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className={`checkbox-row ${form.receiveApplicationEmails ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.receiveApplicationEmails}
                  onChange={(e) =>
                    setForm({ ...form, receiveApplicationEmails: e.target.checked })
                  }
                />
                <span>Send this user an email whenever a customer submits a loan application</span>
              </label>
            </div>
            <button type="submit" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : 'Create user'}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}>
            <span className="spinner dark" />
          </div>
        ) : users.length === 0 ? (
          <div className="list-empty">
            <h3>No team members yet</h3>
            <p>Add a manager or another admin to get started.</p>
          </div>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Loan emails</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.firstName} {u.surname}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-approved' : 'badge-received'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => toggleReceive(u)}
                      disabled={togglingId === u.id}
                    >
                      {togglingId === u.id ? (
                        <span className="spinner dark" />
                      ) : u.receiveApplicationEmails ? (
                        '✓ On'
                      ) : (
                        'Off'
                      )}
                    </button>
                  </td>
                  <td>{u.createdAt ? formatDate(u.createdAt) : '—'}</td>
                  <td>
                    {me?.id !== u.id && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={removingId === u.id}
                        onClick={() => handleRemove(u)}
                      >
                        {removingId === u.id ? <span className="spinner dark" /> : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
