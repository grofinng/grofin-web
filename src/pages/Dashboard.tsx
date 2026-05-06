import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applicationsApi } from '../api/applications';
import { Application } from '../types';
import { extractApiError } from '../api/client';
import { formatNaira, formatDate } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';

export function Dashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    applicationsApi
      .list()
      .then((list) => !cancelled && setApps(list))
      .catch((err) => !cancelled && setError(extractApiError(err, 'Could not load applications')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const total = apps.reduce((acc, a) => acc + a.loanAmount, 0);
  const latest = apps[0];

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>Hi {user?.firstName}, welcome to GroFin</h1>
          <p>Apply for support with everyday essentials and track the status of your applications.</p>
        </div>
        <Link to="/apply" className="btn">
          New application
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <Stat label="Applications" value={String(apps.length)} />
        <Stat label="Total requested" value={formatNaira(total)} />
        <Stat label="Latest status" value={latest ? <StatusBadge status={latest.status} /> : '—'} />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>Your recent applications</h2>
        <p>
          {loading
            ? 'Loading…'
            : apps.length
            ? 'A summary of your most recent loan applications.'
            : 'You haven’t submitted any applications yet.'}
        </p>

        {loading ? (
          <div style={{ padding: '2rem', display: 'grid', placeItems: 'center' }}>
            <span className="spinner dark" />
          </div>
        ) : apps.length === 0 ? (
          <div className="list-empty">
            <h3>No applications yet</h3>
            <p>Start a new application to request support for groceries or medications.</p>
            <Link to="/apply" className="btn">Start application</Link>
          </div>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Amount</th>
                <th>Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.slice(0, 5).map((a) => (
                <tr key={a._id}>
                  <td>{formatDate(a.createdAt)}</td>
                  <td>{formatNaira(a.loanAmount)}</td>
                  <td>{a.purposes.join(', ')}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--gf-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gf-green-900)' }}>{value}</div>
    </div>
  );
}
