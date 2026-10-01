import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applicationsApi } from '../api/applications';
import { Application, ApplicationStatus, Vendor } from '../types';
import { extractApiError } from '../api/client';
import { formatDate, formatNaira } from '../utils/format';
import { RepaymentBadge, StatusBadge } from '../components/StatusBadge';
import { RepaymentBanner } from '../components/RepaymentBanner';
import { repaymentBreakdown } from '../utils/loan';

const STATUS_PIPELINE: ApplicationStatus[] = ['received', 'processing', 'approved'];

const NEXT_COPY: Record<ApplicationStatus, { title: string; body: string }> = {
  received: {
    title: 'Application received',
    body: 'We have your application. Our team will start the review shortly.',
  },
  processing: {
    title: 'Under review',
    body: 'Your application is being processed. You\'ll get an email update once a decision is made.',
  },
  approved: {
    title: 'Approved',
    body: 'Your loan has been approved. Your repayment details are below.',
  },
  rejected: {
    title: 'Not approved',
    body: 'Unfortunately your application was not approved this time. Reach out to us for more information.',
  },
};

type Filter = 'all' | ApplicationStatus;

export function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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

  const filtered = useMemo(
    () => (filter === 'all' ? apps : apps.filter((a) => a.status === filter)),
    [apps, filter]
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: apps.length,
      received: 0,
      processing: 0,
      approved: 0,
      rejected: 0,
    };
    apps.forEach((a) => {
      c[a.status]++;
    });
    return c;
  }, [apps]);

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>My applications</h1>
          <p>Track the status of every application you've submitted with Esena Africa.</p>
        </div>
        <Link to="/apply" className="btn">New application</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && <RepaymentBanner applications={apps} showLink={false} />}

      {!loading && apps.length > 0 && (
        <div className="admin-toolbar">
          {(['all', 'received', 'processing', 'approved', 'rejected'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 && (
                <span style={{ marginLeft: 6, opacity: 0.7 }}>· {counts[f]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <span className="spinner dark" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card list-empty">
          <h3>{apps.length === 0 ? 'No applications yet' : 'Nothing matches that filter'}</h3>
          <p>
            {apps.length === 0
              ? 'Start your first Esena Africa application — it only takes a few minutes.'
              : 'Try a different filter or start a new application.'}
          </p>
          {apps.length === 0 && (
            <Link to="/apply" className="btn">Start application</Link>
          )}
        </div>
      ) : (
        <div className="app-grid">
          {filtered.map((a) => (
            <ApplicationCard key={a._id} application={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ application: a }: { application: Application }) {
  const navigate = useNavigate();
  const next = NEXT_COPY[a.status];
  const isRejected = a.status === 'rejected';
  const canEdit = isRejected && !!a.allowEdit;
  const b = repaymentBreakdown(a);
  const repayTotal = b.total;
  const daysLeft = a.dueDate && !a.repaidAt ? b.days : null;
  const isRepaid = a.status === 'approved' && !!a.repaidAt;

  return (
    <article className={`app-card status-${a.status}`}>
      <div className="app-card-stripe" />
      <div className="app-card-body">
        <header className="app-card-head">
          <div>
            <div className="app-card-amount">{formatNaira(a.loanAmount)}</div>
            <div className="app-card-ref">Ref · {a._id.slice(-8).toUpperCase()}</div>
          </div>
          <span className="badge-row">
            <StatusBadge status={a.status} />
            <RepaymentBadge application={a} />
          </span>
        </header>

        <div className="app-card-purposes">
          {a.purposes.map((p) => (
            <span key={p} className="purpose-chip">{p}</span>
          ))}
        </div>

        <div className="app-card-meta">
          <span><strong>To repay</strong> · {formatNaira(repayTotal)}</span>
          <span><strong>Submitted</strong> · {formatDate(a.createdAt)}</span>
          {a.updatedAt !== a.createdAt && (
            <span><strong>Updated</strong> · {formatDate(a.updatedAt)}</span>
          )}
          {a.purposes.length > 1 && (
            <span><strong>Split</strong> · {a.purposeBreakdown.map((b) => `${b.purpose} ${formatNaira(b.amount)}`).join(' + ')}</span>
          )}
        </div>

        {a.vendorSelections && a.vendorSelections.length > 0 && (
          <div className="app-card-meta">
            {a.vendorSelections.map((s, i) => {
              const v = typeof s.vendor === 'object' ? (s.vendor as Vendor) : null;
              return (
                <span key={`${s.purpose}-${i}`}>
                  <strong>{s.purpose}</strong> · {v ? `${v.businessName} (${v.area})` : '—'}
                </span>
              );
            })}
          </div>
        )}

        {!isRejected ? (
          <>
            <div className="app-card-progress" aria-label="Status progress">
              {STATUS_PIPELINE.map((s, i) => {
                const currentIndex = STATUS_PIPELINE.indexOf(a.status);
                const cls =
                  currentIndex === -1
                    ? ''
                    : i < currentIndex
                    ? 'done'
                    : i === currentIndex
                    ? 'current'
                    : '';
                return <div key={s} className={`progress-step ${cls}`} style={i > 0 ? { marginLeft: 4 } : undefined} />;
              })}
            </div>
            <div className="progress-labels">
              {STATUS_PIPELINE.map((s) => (
                <span key={s} className={s === a.status ? 'active' : ''}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          </>
        ) : null}

        {a.status === 'approved' && (
          <div className="repay-box">
            <div className="repay-box-title">Repayment</div>
            <div className="repay-box-rows">
              <span>Borrowed <strong>{formatNaira(a.loanAmount)}</strong></span>
              <span>Total to repay <strong>{formatNaira(repayTotal)}</strong></span>
              {b.lateInterest > 0 && (
                <span className="repay-overdue">
                  Late interest <strong>{formatNaira(b.lateInterest)}</strong>
                </span>
              )}
              {b.lateInterest > 0 && (
                <span className="repay-overdue">
                  {isRepaid ? 'Paid' : 'Due now'} <strong>{formatNaira(b.amountDue)}</strong>
                </span>
              )}
            </div>
            {!isRepaid && (
              <div className="repay-policy">
                {b.inGrace
                  ? `Grace period: pay within ${b.graceDays - b.daysOverdue} day${b.graceDays - b.daysOverdue === 1 ? '' : 's'} to avoid ${b.lateRate}% daily late interest (${formatNaira(b.dailyLate)} per day).`
                  : b.lateInterest > 0
                  ? `${formatNaira(b.dailyLate)} is added every further day until you pay.`
                  : `${b.graceDays}-day grace after the due date, then ${b.lateRate}% of the total (${formatNaira(b.dailyLate)}) is added per day.`}
              </div>
            )}
            {isRepaid && (
              <div>
                <span className="badge badge-repaid">Repaid</span> on <strong>{formatDate(a.repaidAt as string)}</strong>
              </div>
            )}
            {a.dueDate && !isRepaid && (
              <div>
                Due <strong>{formatDate(a.dueDate)}</strong>
                {daysLeft != null && (
                  <span className={daysLeft < 0 ? 'repay-overdue' : undefined}>
                    {' '}
                    · {daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : `${-daysLeft} day${daysLeft === -1 ? '' : 's'} overdue`}
                  </span>
                )}
              </div>
            )}
            {a.repaymentAccountNumber && !isRepaid && (
              <div>
                Pay into <strong>{a.repaymentBank}</strong> · <strong>{a.repaymentAccountNumber}</strong>{' '}
                ({a.repaymentAccountName})
              </div>
            )}
          </div>
        )}

        <div className="app-card-next">
          {isRepaid ? (
            <>
              <strong>Repaid.</strong> Thank you — this loan was settled on {formatDate(a.repaidAt as string)}.
            </>
          ) : (
            <>
              <strong>{next.title}.</strong> {next.body}
            </>
          )}
          {a.statusNote && (
            <div style={{ marginTop: '0.4rem', fontStyle: 'italic' }}>
              <strong>Reason:</strong> “{a.statusNote}”
            </div>
          )}
          {isRejected && !canEdit && (
            <div style={{ marginTop: '0.4rem' }}>
              This application is closed for edits. Reach out to Esena Africa support if you'd like to start a new one.
            </div>
          )}
        </div>

        {canEdit && (
          <div className="app-card-foot">
            <span style={{ color: 'var(--gf-muted)', fontSize: '0.85rem' }}>
              You can update your details and resubmit this application.
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => navigate(`/apply/${a._id}`)}
            >
              Edit & resubmit
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
