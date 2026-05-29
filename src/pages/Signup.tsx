import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { extractApiError } from '../api/client';
import { emailNotifications } from '../utils/email';

export function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    surname: '',
    email: '',
    nin: '',
    password: '',
    confirm: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): string | null => {
    if (!form.firstName.trim()) return 'First name is required';
    if (!form.surname.trim()) return 'Surname is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address';
    if (!/^\d{11}$/.test(form.nin)) return 'NIN must be 11 digits';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirm) return 'Passwords do not match';
    if (!acceptedTerms) return 'You must accept the Terms & Conditions to continue';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) return setError(v);

    setSubmitting(true);
    try {
      const user = await register({
        firstName: form.firstName.trim(),
        surname: form.surname.trim(),
        email: form.email.trim().toLowerCase(),
        nin: form.nin,
        password: form.password,
        acceptedTerms,
      });
      emailNotifications.registration({ email: user.email, firstName: user.firstName });
      toast.success('Account created — welcome to Esena Africa');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'Could not create account'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <h1 style={{ fontSize: '1.5rem' }}>Create your account</h1>
          <p>It only takes a minute.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" value={form.firstName} onChange={update('firstName')} required />
            </div>
            <div className="form-group">
              <label htmlFor="surname">Surname</label>
              <input id="surname" value={form.surname} onChange={update('surname')} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
          </div>
          <div className="form-group">
            <label htmlFor="nin">NIN (11 digits)</label>
            <input
              id="nin"
              inputMode="numeric"
              maxLength={11}
              value={form.nin}
              onChange={(e) =>
                setForm((f) => ({ ...f, nin: e.target.value.replace(/\D/g, '').slice(0, 11) }))
              }
              required
            />
            <span className="field-help">We use this to verify your identity for loan applications.</span>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={update('password')} required />
              <span className="field-help">At least 6 characters</span>
            </div>
            <div className="form-group">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} required />
            </div>
          </div>
          <div className="form-group">
            <label className={`checkbox-row ${acceptedTerms ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I have read, understood and agree to Esena Africa's{' '}
                <Link to="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</Link>.
              </span>
            </label>
          </div>
          <button type="submit" className="btn btn-block" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
