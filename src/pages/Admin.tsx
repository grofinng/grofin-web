import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { applicationsApi } from '../api/applications';
import { extractApiError, FILE_BASE } from '../api/client';
import { Application, ApplicationStatus, PopulatedUserRef, Vendor } from '../types';
import { formatDate, formatNaira } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';
import { emailNotifications } from '../utils/email';
import { useAuth } from '../context/AuthContext';

type Filter = 'all' | ApplicationStatus;

export function Admin() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'manager';
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [allowEditDraft, setAllowEditDraft] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    applicationsApi
      .adminListAll()
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

  const totals = useMemo(() => {
    const totalRequested = apps.reduce((sum, a) => sum + a.loanAmount, 0);
    const approvedTotal = apps
      .filter((a) => a.status === 'approved')
      .reduce((sum, a) => sum + a.loanAmount, 0);
    return { totalRequested, approvedTotal };
  }, [apps]);

  const updateStatus = async (a: Application, status: ApplicationStatus) => {
    const note = (noteDraft[a._id] ?? a.statusNote ?? '').trim();
    if (status === 'rejected' && !note) {
      toast.error('A reason is required when rejecting an application.');
      return;
    }
    const allowEdit = status === 'rejected' ? !!allowEditDraft[a._id] : false;

    setActingId(a._id);
    try {
      const updated = await applicationsApi.adminUpdateStatus(a._id, {
        status,
        statusNote: note,
        allowEdit,
      });
      setApps((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      toast.success(`Application ${status}`);

      if (status === 'approved') {
        emailNotifications.applicationApproved({
          email: updated.email,
          firstName: updated.firstName,
          loanAmount: updated.loanAmount,
          applicationId: updated._id,
        });
      }
      if (status === 'rejected') {
        emailNotifications.applicationRejected({
          email: updated.email,
          firstName: updated.firstName,
          loanAmount: updated.loanAmount,
          applicationId: updated._id,
          reason: note,
          canEdit: allowEdit,
        });
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Could not update status'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>{isReadOnly ? 'Manager · Applications' : 'Admin · Applications'}</h1>
          <p>
            {isReadOnly
              ? 'Review every application across the platform. View only — only admins can approve or reject.'
              : 'Review every application, change status, and approve loans.'}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {isReadOnly && (
        <div className="alert alert-info">
          You're signed in as a manager. You can review applications but not change their status — contact an admin for approvals.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <Stat label="Total applications" value={String(apps.length)} />
        <Stat label="Pending" value={String(counts.received + counts.processing)} />
        <Stat label="Total requested" value={formatNaira(totals.totalRequested)} />
        <Stat label="Approved value" value={formatNaira(totals.approvedTotal)} />
      </div>

      <div className="admin-toolbar">
        {(['all', 'received', 'processing', 'approved', 'rejected'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>· {counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}>
            <span className="spinner dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="list-empty">
            <h3>No applications match that filter</h3>
          </div>
        ) : (
          <>
            <div className="admin-row head">
              <span>Applicant</span>
              <span>Amount</span>
              <span>Submitted</span>
              <span>Status</span>
              <span></span>
            </div>
            {filtered.map((a) => {
              const isOpen = openId === a._id;
              const userRef =
                typeof a.user === 'object' && a.user
                  ? (a.user as PopulatedUserRef)
                  : null;
              return (
                <div key={a._id}>
                  <div className="admin-row">
                    <span>
                      <div style={{ fontWeight: 600 }}>
                        {a.surname} {a.firstName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gf-muted)' }}>
                        {a.email}
                        {userRef && userRef.email !== a.email && ` · acct ${userRef.email}`}
                      </div>
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatNaira(a.loanAmount)}</span>
                    <span>{formatDate(a.createdAt)}</span>
                    <span><StatusBadge status={a.status} /></span>
                    <span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setOpenId(isOpen ? null : a._id)}
                      >
                        {isOpen ? 'Close' : 'Review'}
                      </button>
                    </span>
                  </div>

                  {isOpen && (
                    <div className="admin-detail">
                      <h3>Applicant</h3>
                      <div className="detail-grid">
                        <div><strong>Name</strong>{a.surname} {a.firstName} {a.middleName}</div>
                        <div><strong>Email</strong>{a.email}</div>
                        <div><strong>Mobile</strong>{a.mobileNumber}{a.altNumber && ` · ${a.altNumber}`}</div>
                        <div><strong>Address</strong>{a.houseAddress}, {a.lga}, {a.state}</div>
                        <div><strong>BVN</strong>{a.bvn}</div>
                        <div><strong>NIN</strong>{a.nin}</div>
                        <div><strong>Referred by</strong>{a.referredBy}{a.referralContact && ` (${a.referralContact})`}</div>
                      </div>

                      <h3>Employment</h3>
                      <div className="detail-grid">
                        <div><strong>Employer</strong>{a.employerName}</div>
                        <div><strong>Office</strong>{a.officeAddress}</div>
                      </div>

                      <h3>Loan</h3>
                      <div className="detail-grid">
                        <div><strong>Amount</strong>{formatNaira(a.loanAmount)}</div>
                        <div><strong>Purpose</strong>{a.purposes.join(', ')}</div>
                        {a.purposes.length > 1 && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <strong>Breakdown</strong>
                            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1rem' }}>
                              {a.purposeBreakdown.map((b) => (
                                <li key={b.purpose}>
                                  {b.purpose}: <strong>{formatNaira(b.amount)}</strong>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <h3>Selected vendors</h3>
                      {a.vendorSelections && a.vendorSelections.length > 0 ? (
                        <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.25rem' }}>
                          {a.vendorSelections.map((s, i) => {
                            const v = typeof s.vendor === 'object' ? (s.vendor as Vendor) : null;
                            return (
                              <li key={`${s.purpose}-${i}`}>
                                <strong>{s.purpose}</strong> ·{' '}
                                {v ? (
                                  <>
                                    {v.businessName} ({v.partnerCode}) — {v.area}
                                    {v.contactPhone && ` · ${v.contactPhone}`}
                                  </>
                                ) : (
                                  '—'
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p style={{ marginBottom: '0.5rem', color: 'var(--gf-muted)' }}>None.</p>
                      )}

                      <h3>Documents</h3>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {a.validId && <DocLink label="Valid ID" path={a.validId.path} />}
                        {a.offerLetter && <DocLink label="Offer letter" path={a.offerLetter.path} />}
                        {a.bankStatement && <DocLink label="Bank statement" path={a.bankStatement.path} />}
                        {a.staffId && <DocLink label="Staff ID" path={a.staffId.path} />}
                      </div>

                      {isReadOnly ? (
                        a.statusNote && (
                          <>
                            <h3>Note</h3>
                            <p style={{ margin: 0 }}>{a.statusNote}</p>
                          </>
                        )
                      ) : (
                        <>
                          <h3>Decision</h3>
                          <div className="form-group">
                            <label htmlFor={`note-${a._id}`}>
                              Note <span style={{ color: 'var(--gf-muted)', fontWeight: 400 }}>· required when rejecting</span>
                            </label>
                            <textarea
                              id={`note-${a._id}`}
                              value={noteDraft[a._id] ?? a.statusNote ?? ''}
                              onChange={(e) =>
                                setNoteDraft((prev) => ({ ...prev, [a._id]: e.target.value }))
                              }
                              placeholder="Visible to the applicant. For rejections, explain what they can fix."
                            />
                          </div>

                          <div className="form-group">
                            <label className={`checkbox-row ${(allowEditDraft[a._id] ?? a.allowEdit) ? 'checked' : ''}`}>
                              <input
                                type="checkbox"
                                checked={allowEditDraft[a._id] ?? !!a.allowEdit}
                                onChange={(e) =>
                                  setAllowEditDraft((prev) => ({
                                    ...prev,
                                    [a._id]: e.target.checked,
                                  }))
                                }
                              />
                              <span>
                                Allow the applicant to edit and resubmit this application (only applies on Reject)
                              </span>
                            </label>
                          </div>

                          <div className="action-bar">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={actingId === a._id || a.status === 'received'}
                              onClick={() => updateStatus(a, 'received')}
                            >
                              Mark received
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={actingId === a._id || a.status === 'processing'}
                              onClick={() => updateStatus(a, 'processing')}
                            >
                              Mark processing
                            </button>
                            <button
                              type="button"
                              className="btn btn-success"
                              disabled={actingId === a._id || a.status === 'approved'}
                              onClick={() => updateStatus(a, 'approved')}
                            >
                              {actingId === a._id ? <span className="spinner" /> : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={actingId === a._id || a.status === 'rejected'}
                              onClick={() => updateStatus(a, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--gf-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gf-green-900)' }}>{value}</div>
    </div>
  );
}

function DocLink({ label, path }: { label: string; path: string }) {
  return (
    <a className="btn btn-secondary" href={`${FILE_BASE}${path}`} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
