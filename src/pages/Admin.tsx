import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { applicationsApi } from '../api/applications';
import { extractApiError } from '../api/client';
import { Application, ApplicationStatus, PopulatedUserRef } from '../types';
import { formatDate, formatNaira } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationReview, applicationDocuments } from '../components/ApplicationReview';
import { useAuth } from '../context/AuthContext';
import { saveRepaymentAccount, useRepaymentAccount } from '../hooks/useRepaymentAccount';

type Filter = 'all' | ApplicationStatus;

export function Admin() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'manager';
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

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

  const onUpdated = (updated: Application) =>
    setApps((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>{isReadOnly ? 'Manager · Applications' : 'Admin · Applications'}</h1>
          <p>
            {isReadOnly
              ? 'Review every application across the platform. View only — only admins can approve or reject.'
              : 'Review every application, read the submitted documents, and approve or reject loans.'}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {isReadOnly && (
        <div className="alert alert-info">
          You're signed in as a manager. You can review applications but not change their status — contact an admin for approvals.
        </div>
      )}

      <div className="stat-grid">
        <Stat label="Total applications" value={String(apps.length)} />
        <Stat label="Awaiting decision" value={String(counts.received + counts.processing)} />
        <Stat label="Total requested" value={formatNaira(totals.totalRequested)} />
        <Stat label="Approved value" value={formatNaira(totals.approvedTotal)} />
      </div>

      {!isReadOnly && <RepaymentAccountCard />}

      <div className="admin-toolbar">
        {(['all', 'received', 'processing', 'approved', 'rejected'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="filter-count">· {counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="card admin-list">
        {loading ? (
          <div className="admin-loading">
            <span className="spinner dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="list-empty">
            <h3>No applications match that filter</h3>
            <p>Try another status above.</p>
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
                typeof a.user === 'object' && a.user ? (a.user as PopulatedUserRef) : null;
              const docCount = applicationDocuments(a).length;
              return (
                <div key={a._id} className={`admin-item ${isOpen ? 'open' : ''}`}>
                  <div
                    className="admin-row clickable"
                    onClick={() => setOpenId(isOpen ? null : a._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenId(isOpen ? null : a._id);
                      }
                    }}
                  >
                    <span>
                      <div className="admin-row-title">
                        {a.surname} {a.firstName}
                      </div>
                      <div className="admin-row-sub">
                        {a.email}
                        {userRef && userRef.email !== a.email && ` · acct ${userRef.email}`}
                      </div>
                    </span>
                    <span>
                      <div className="admin-row-title">{formatNaira(a.loanAmount)}</div>
                      <div className="admin-row-sub">
                        {a.purposes.join(', ')} · {docCount} doc{docCount === 1 ? '' : 's'}
                      </div>
                    </span>
                    <span>{formatDate(a.createdAt)}</span>
                    <span>
                      <StatusBadge status={a.status} />
                    </span>
                    <span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(isOpen ? null : a._id);
                        }}
                      >
                        {isOpen ? 'Close' : 'Review'}
                      </button>
                    </span>
                  </div>

                  {isOpen && (
                    <ApplicationReview
                      key={a._id}
                      application={a}
                      readOnly={isReadOnly}
                      onUpdated={onUpdated}
                    />
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
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

/**
 * Admin-editable default repayment account. Pre-fills the approval form and
 * is sent to customers in the approval email.
 */
function RepaymentAccountCard() {
  const { account, loading, error } = useRepaymentAccount();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ bank: '', accountNumber: '', accountName: '' });

  const startEdit = () => {
    if (!account) return;
    setDraft({ bank: account.bank, accountNumber: account.accountNumber, accountName: account.accountName });
    setEditing(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.bank.trim() || !draft.accountName.trim()) {
      toast.error('Enter the bank and account name.');
      return;
    }
    if (!/^\d{10}$/.test(draft.accountNumber)) {
      toast.error('The account number must be 10 digits.');
      return;
    }
    setSaving(true);
    try {
      await saveRepaymentAccount({
        bank: draft.bank.trim(),
        accountNumber: draft.accountNumber.trim(),
        accountName: draft.accountName.trim(),
      });
      toast.success('Default repayment account saved');
      setEditing(false);
    } catch (err) {
      toast.error(extractApiError(err, 'Could not save the repayment account'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card settings-card">
      <div className="settings-card-head">
        <div>
          <h3>Default repayment account</h3>
          <p>
            Pre-filled when approving a loan and sent to the customer in the approval email.
            {account?.updatedAt
              ? ` Last updated ${formatDate(account.updatedAt)}.`
              : account?.isFallback
              ? ' Not saved yet — showing the built-in default.'
              : ''}
          </p>
        </div>
        {!editing && account && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <span className="spinner dark" />}

      {account && !editing && (
        <div className="account-card settings-account">
          <div className="account-card-bank">{account.bank}</div>
          <div className="account-card-number mono">{account.accountNumber}</div>
          <div className="account-card-name">{account.accountName}</div>
        </div>
      )}

      {editing && (
        <form onSubmit={submit} className="settings-form">
          <div className="form-row-3">
            <div className="form-group">
              <label htmlFor="default-repay-bank">Bank</label>
              <input
                id="default-repay-bank"
                value={draft.bank}
                placeholder="e.g. Kuda MFB"
                onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="default-repay-number">Account number</label>
              <input
                id="default-repay-number"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 digits"
                value={draft.accountNumber}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="default-repay-name">Account name</label>
              <input
                id="default-repay-name"
                placeholder="Account name"
                value={draft.accountName}
                onChange={(e) => setDraft((d) => ({ ...d, accountName: e.target.value }))}
              />
            </div>
          </div>
          <div className="action-group">
            <button type="submit" className="btn btn-sm" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save default'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
