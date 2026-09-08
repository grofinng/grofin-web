import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { vendorRequestsApi } from '../api/vendorRequests';
import { contactRequestsApi } from '../api/contactRequests';
import { applicationsApi } from '../api/applications';
import { extractApiError } from '../api/client';
import { DocumentItem, DocumentList } from '../components/DocumentViewer';
import { ApplicationReview, applicationDocuments } from '../components/ApplicationReview';
import { StatusBadge } from '../components/StatusBadge';
import { Application, ContactRequest, VendorRequest, VendorRequestStatus } from '../types';
import { formatDate, formatNaira } from '../utils/format';

type TypeFilter = 'all' | 'loan' | 'partner' | 'contact';
type StatusFilter = 'all' | 'pending' | 'closed';

interface LoanItem {
  type: 'loan';
  id: string;
  createdAt: string;
  data: Application;
}
interface PartnerItem {
  type: 'partner';
  id: string;
  createdAt: string;
  data: VendorRequest;
}
interface ContactItem {
  type: 'contact';
  id: string;
  createdAt: string;
  data: ContactRequest;
}
type Item = LoanItem | PartnerItem | ContactItem;

const VENDOR_BADGE: Record<VendorRequestStatus, string> = {
  pending: 'badge-processing',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
};

const TYPE_LABEL: Record<TypeFilter, string> = {
  all: 'All types',
  loan: 'Loans',
  partner: 'Partners',
  contact: 'Contact',
};

function isPending(it: Item) {
  if (it.type === 'loan') return it.data.status === 'received' || it.data.status === 'processing';
  return it.data.status === 'pending';
}

export function AdminRequests() {
  const [loans, setLoans] = useState<Application[]>([]);
  const [partners, setPartners] = useState<VendorRequest[]>([]);
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    // Each feed loads independently so one failing source doesn't blank the page.
    const settle = <T,>(p: Promise<T[]>, set: (v: T[]) => void, label: string) =>
      p.then((v) => !cancelled && set(v)).catch((err) => {
        if (!cancelled) setError((prev) => prev || extractApiError(err, `Could not load ${label}`));
      });
    Promise.all([
      settle(applicationsApi.adminListAll(), setLoans, 'loan applications'),
      settle(vendorRequestsApi.list(), setPartners, 'partner requests'),
      settle(contactRequestsApi.list(), setContacts, 'contact requests'),
    ]).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const combined = useMemo<Item[]>(() => {
    const items: Item[] = [
      ...loans.map<LoanItem>((a) => ({ type: 'loan', id: a._id, createdAt: a.createdAt, data: a })),
      ...partners.map<PartnerItem>((p) => ({ type: 'partner', id: p._id, createdAt: p.createdAt, data: p })),
      ...contacts.map<ContactItem>((c) => ({ type: 'contact', id: c._id, createdAt: c.createdAt, data: c })),
    ];
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items;
  }, [loans, partners, contacts]);

  const filtered = useMemo(() => {
    return combined.filter((it) => {
      if (typeFilter !== 'all' && it.type !== typeFilter) return false;
      if (statusFilter === 'pending' && !isPending(it)) return false;
      if (statusFilter === 'closed' && isPending(it)) return false;
      return true;
    });
  }, [combined, typeFilter, statusFilter]);

  const counts = useMemo(() => {
    const byType = (t: TypeFilter) => (t === 'all' ? combined : combined.filter((i) => i.type === t));
    const pendingOf = (t: TypeFilter) => byType(t).filter(isPending).length;
    return {
      total: { all: combined.length, loan: loans.length, partner: partners.length, contact: contacts.length },
      pending: { all: pendingOf('all'), loan: pendingOf('loan'), partner: pendingOf('partner'), contact: pendingOf('contact') },
    };
  }, [combined, loans, partners, contacts]);

  const onLoanUpdated = (updated: Application) =>
    setLoans((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));

  const approvePartner = async (req: VendorRequest) => {
    setActingId(req._id);
    try {
      const updated = await vendorRequestsApi.approve(req._id, noteDraft[req._id] || '');
      setPartners((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      toast.success(`Approved — partner code ${updated.approvedVendor?.partnerCode || 'assigned'}`);
    } catch (err) {
      toast.error(extractApiError(err, 'Could not approve request'));
    } finally {
      setActingId(null);
    }
  };

  const rejectPartner = async (req: VendorRequest) => {
    const reason = (noteDraft[req._id] ?? req.adminNote ?? '').trim();
    if (!reason) {
      toast.error('Add a reason in the note before rejecting.');
      return;
    }
    setActingId(req._id);
    try {
      const updated = await vendorRequestsApi.reject(req._id, reason);
      setPartners((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      toast.success('Request rejected');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not reject request'));
    } finally {
      setActingId(null);
    }
  };

  const resolveContact = async (req: ContactRequest) => {
    setActingId(req._id);
    try {
      const updated = await contactRequestsApi.update(req._id, {
        status: 'resolved',
        adminNote: noteDraft[req._id] ?? req.adminNote ?? '',
      });
      setContacts((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      toast.success('Marked as resolved');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not update request'));
    } finally {
      setActingId(null);
    }
  };

  const reopenContact = async (req: ContactRequest) => {
    setActingId(req._id);
    try {
      const updated = await contactRequestsApi.update(req._id, { status: 'pending' });
      setContacts((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      toast.success('Re-opened');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not update request'));
    } finally {
      setActingId(null);
    }
  };

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const rowProps = (id: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: () => toggle(id),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(id);
      }
    },
  });

  const reviewButton = (id: string) => (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={(e) => {
        e.stopPropagation();
        toggle(id);
      }}
    >
      {openId === id ? 'Close' : 'Review'}
    </button>
  );

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>Admin · Requests</h1>
          <p>Everything waiting on you in one inbox: loan applications, partner sign-ups and contact enquiries.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">Loans awaiting decision</div>
          <div className="stat-value">{counts.pending.loan}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Partner sign-ups pending</div>
          <div className="stat-value">{counts.pending.partner}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Enquiries open</div>
          <div className="stat-value">{counts.pending.contact}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">All requests</div>
          <div className="stat-value">{counts.total.all}</div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="filter-group" aria-label="Request type">
          {(['all', 'loan', 'partner', 'contact'] as TypeFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-pill ${typeFilter === f ? 'active' : ''}`}
              onClick={() => setTypeFilter(f)}
            >
              {TYPE_LABEL[f]}
              <span className="filter-count">
                · {statusFilter === 'pending' ? counts.pending[f] : counts.total[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="filter-group" aria-label="Request status">
          {(['pending', 'closed', 'all'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-pill ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'pending' ? 'Pending' : f === 'closed' ? 'Closed' : 'Any status'}
            </button>
          ))}
        </div>
      </div>

      <div className="card admin-list">
        {loading ? (
          <div className="admin-loading">
            <span className="spinner dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="list-empty">
            <h3>Nothing matches this view</h3>
            <p>
              {statusFilter === 'pending'
                ? 'No pending requests right now. Switch to "Any status" to see closed ones.'
                : 'Try a different type or status filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="admin-row head">
              <span>Request</span>
              <span>From</span>
              <span>Received</span>
              <span>Status</span>
              <span></span>
            </div>
            {filtered.map((it) => {
              const isOpen = openId === it.id;

              if (it.type === 'loan') {
                const a = it.data;
                const docCount = applicationDocuments(a).length;
                return (
                  <div key={it.id} className={`admin-item ${isOpen ? 'open' : ''}`}>
                    <div className="admin-row clickable" {...rowProps(it.id)}>
                      <span>
                        <div className="admin-row-title">
                          <span className="badge badge-processing type-badge">Loan</span>
                          {formatNaira(a.loanAmount)}
                        </div>
                        <div className="admin-row-sub">
                          {a.purposes.join(', ')} · {docCount} doc{docCount === 1 ? '' : 's'}
                        </div>
                      </span>
                      <span>
                        <div>
                          {a.surname} {a.firstName}
                        </div>
                        <div className="admin-row-sub">{a.email}</div>
                      </span>
                      <span>{formatDate(a.createdAt)}</span>
                      <span>
                        <StatusBadge status={a.status} />
                      </span>
                      <span>
                        {reviewButton(it.id)}
                      </span>
                    </div>
                    {isOpen && <ApplicationReview key={a._id} application={a} onUpdated={onLoanUpdated} />}
                  </div>
                );
              }

              if (it.type === 'partner') {
                const r = it.data;
                const photos: DocumentItem[] = [];
                if (r.storefrontPhoto) photos.push({ label: 'Store front', file: r.storefrontPhoto });
                if (r.goodsPhoto) photos.push({ label: 'Goods inside', file: r.goodsPhoto });
                return (
                  <div key={it.id} className={`admin-item ${isOpen ? 'open' : ''}`}>
                    <div className="admin-row clickable" {...rowProps(it.id)}>
                      <span>
                        <div className="admin-row-title">
                          <span className="badge badge-approved type-badge">Partner</span>
                          {r.businessName}
                        </div>
                        <div className="admin-row-sub">
                          {r.category} · {r.area}
                        </div>
                      </span>
                      <span>
                        <div>{r.ownerName}</div>
                        <div className="admin-row-sub">{r.ownerEmail}</div>
                      </span>
                      <span>{formatDate(r.createdAt)}</span>
                      <span>
                        <span className={`badge ${VENDOR_BADGE[r.status]}`}>{r.status}</span>
                      </span>
                      <span>
                        {reviewButton(it.id)}
                      </span>
                    </div>

                    {isOpen && (
                      <div className="review-panel">
                        <div className="review-sections">
                          <section className="review-section">
                            <h3>Business</h3>
                            <div className="detail-grid">
                              <div><strong>Name</strong>{r.businessName}</div>
                              <div><strong>Category</strong>{r.category}</div>
                              <div><strong>Area</strong>{r.area}</div>
                              <div><strong>Business phone</strong>{r.contactPhone || '—'}</div>
                              <div><strong>CAC registered?</strong>{r.cacRegistered || '—'}</div>
                              <div className="span-2"><strong>Address</strong>{r.address}</div>
                            </div>
                          </section>

                          <section className="review-section">
                            <h3>Owner</h3>
                            <div className="detail-grid">
                              <div><strong>Name</strong>{r.ownerName}</div>
                              <div><strong>Phone</strong>{r.ownerPhone}</div>
                              <div className="span-2">
                                <strong>Email</strong>
                                <a href={`mailto:${r.ownerEmail}`}>{r.ownerEmail}</a>
                              </div>
                            </div>
                            {r.notes && (
                              <>
                                <h3 style={{ marginTop: '1rem' }}>Notes from applicant</h3>
                                <p className="review-text">{r.notes}</p>
                              </>
                            )}
                          </section>

                          <section className="review-section span-2">
                            <h3>Photos</h3>
                            <DocumentList docs={photos} emptyText="No photos were uploaded." />
                          </section>

                          {r.status === 'approved' && r.approvedVendor && (
                            <div className="alert alert-success span-2">
                              Approved · partner code <strong>{r.approvedVendor.partnerCode}</strong>.
                            </div>
                          )}
                          {r.status === 'rejected' && r.adminNote && (
                            <div className="alert alert-error span-2">
                              Rejected · <em>"{r.adminNote}"</em>
                            </div>
                          )}

                          {r.status === 'pending' && (
                            <section className="review-section span-2 decision">
                              <h3>Decision</h3>
                              <div className="form-group">
                                <label htmlFor={`note-${it.id}`}>
                                  Note <span className="label-hint">· required when rejecting</span>
                                </label>
                                <textarea
                                  id={`note-${it.id}`}
                                  rows={3}
                                  value={noteDraft[it.id] ?? r.adminNote ?? ''}
                                  onChange={(e) => setNoteDraft((p) => ({ ...p, [it.id]: e.target.value }))}
                                />
                              </div>
                              <div className="action-bar decision-actions">
                                <div className="action-group">
                                  <button
                                    type="button"
                                    className="btn btn-danger"
                                    disabled={actingId === it.id}
                                    onClick={() => rejectPartner(r)}
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-success"
                                    disabled={actingId === it.id}
                                    onClick={() => approvePartner(r)}
                                  >
                                    {actingId === it.id ? <span className="spinner" /> : 'Approve & create vendor'}
                                  </button>
                                </div>
                              </div>
                            </section>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // contact
              const c = it.data;
              return (
                <div key={it.id} className={`admin-item ${isOpen ? 'open' : ''}`}>
                  <div className="admin-row clickable" {...rowProps(it.id)}>
                    <span>
                      <div className="admin-row-title">
                        <span className="badge badge-received type-badge">Contact</span>
                        {c.subject || 'Contact enquiry'}
                      </div>
                      <div className="admin-row-sub">
                        {c.message.slice(0, 80)}
                        {c.message.length > 80 ? '…' : ''}
                      </div>
                    </span>
                    <span>
                      <div>{c.name}</div>
                      <div className="admin-row-sub">{c.email}</div>
                    </span>
                    <span>{formatDate(c.createdAt)}</span>
                    <span>
                      <span className={`badge ${c.status === 'resolved' ? 'badge-approved' : 'badge-processing'}`}>
                        {c.status}
                      </span>
                    </span>
                    <span>
                      {reviewButton(it.id)}
                    </span>
                  </div>

                  {isOpen && (
                    <div className="review-panel">
                      <div className="review-sections">
                        <section className="review-section">
                          <h3>From</h3>
                          <div className="detail-grid">
                            <div><strong>Name</strong>{c.name}</div>
                            <div><strong>Email</strong><a href={`mailto:${c.email}`}>{c.email}</a></div>
                            <div><strong>Phone</strong>{c.phone || '—'}</div>
                            <div><strong>Subject</strong>{c.subject || '—'}</div>
                          </div>
                        </section>

                        <section className="review-section">
                          <h3>Message</h3>
                          <p className="review-text">{c.message}</p>
                        </section>

                        <section className="review-section span-2 decision">
                          <h3>Decision</h3>
                          <div className="form-group">
                            <label htmlFor={`cnote-${it.id}`}>
                              Internal note <span className="label-hint">· optional, not shown to the sender</span>
                            </label>
                            <textarea
                              id={`cnote-${it.id}`}
                              rows={3}
                              value={noteDraft[it.id] ?? c.adminNote ?? ''}
                              onChange={(e) => setNoteDraft((p) => ({ ...p, [it.id]: e.target.value }))}
                            />
                          </div>
                          <div className="action-bar decision-actions">
                            <div className="action-group">
                              <a href={`mailto:${c.email}`} className="btn btn-secondary">
                                Reply by email
                              </a>
                            </div>
                            <div className="action-group">
                              {c.status === 'pending' ? (
                                <button
                                  type="button"
                                  className="btn btn-success"
                                  disabled={actingId === it.id}
                                  onClick={() => resolveContact(c)}
                                >
                                  {actingId === it.id ? <span className="spinner" /> : 'Mark resolved'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  disabled={actingId === it.id}
                                  onClick={() => reopenContact(c)}
                                >
                                  Re-open
                                </button>
                              )}
                            </div>
                          </div>
                        </section>
                      </div>
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

// Keep the old export name working for any existing imports
export { AdminRequests as AdminVendorRequests };
