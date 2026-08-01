import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { vendorRequestsApi } from '../api/vendorRequests';
import { contactRequestsApi } from '../api/contactRequests';
import { extractApiError } from '../api/client';
import { FileLink } from '../components/FileLink';
import { ContactRequest, VendorRequest, VendorRequestStatus } from '../types';
import { formatDate } from '../utils/format';

type TypeFilter = 'all' | 'partner' | 'contact';
type StatusFilter = 'all' | 'pending' | 'closed';

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
type Item = PartnerItem | ContactItem;

const VENDOR_BADGE: Record<VendorRequestStatus, string> = {
  pending: 'badge-processing',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
};

export function AdminRequests() {
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
    Promise.all([vendorRequestsApi.list(), contactRequestsApi.list()])
      .then(([p, c]) => {
        if (cancelled) return;
        setPartners(p);
        setContacts(c);
      })
      .catch((err) => !cancelled && setError(extractApiError(err, 'Could not load requests')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const combined = useMemo<Item[]>(() => {
    const items: Item[] = [
      ...partners.map<PartnerItem>((p) => ({ type: 'partner', id: p._id, createdAt: p.createdAt, data: p })),
      ...contacts.map<ContactItem>((c) => ({ type: 'contact', id: c._id, createdAt: c.createdAt, data: c })),
    ];
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items;
  }, [partners, contacts]);

  const filtered = useMemo(() => {
    return combined.filter((it) => {
      if (typeFilter !== 'all' && it.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const isPending = it.data.status === 'pending';
        if (statusFilter === 'pending' && !isPending) return false;
        if (statusFilter === 'closed' && isPending) return false;
      }
      return true;
    });
  }, [combined, typeFilter, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: combined.length,
      partner: partners.length,
      contact: contacts.length,
      pending:
        partners.filter((p) => p.status === 'pending').length +
        contacts.filter((c) => c.status === 'pending').length,
    };
  }, [combined, partners, contacts]);

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

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>Admin · Requests</h1>
          <p>Partner sign-ups and contact form enquiries.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-toolbar">
        {(['all', 'partner', 'contact'] as TypeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-pill ${typeFilter === f ? 'active' : ''}`}
            onClick={() => setTypeFilter(f)}
          >
            {f === 'all' ? 'All types' : f === 'partner' ? 'Partner' : 'Contact'}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              · {f === 'all' ? counts.all : f === 'partner' ? counts.partner : counts.contact}
            </span>
          </button>
        ))}
        <span style={{ width: 12 }} />
        {(['pending', 'closed', 'all'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-pill ${statusFilter === f ? 'active' : ''}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === 'pending' ? 'Pending' : f === 'closed' ? 'Closed' : 'Any status'}
            {f === 'pending' && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>· {counts.pending}</span>
            )}
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
            <h3>Nothing matches this view</h3>
          </div>
        ) : (
          filtered.map((it) => {
            const isOpen = openId === it.id;
            if (it.type === 'partner') {
              const r = it.data;
              return (
                <div key={it.id}>
                  <div className="admin-row">
                    <span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span className="badge badge-approved">Partner</span>
                        <strong>{r.businessName}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gf-muted)' }}>
                        {r.category} · {r.area}
                      </div>
                    </span>
                    <span>
                      <div>{r.ownerName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gf-muted)' }}>{r.ownerEmail}</div>
                    </span>
                    <span>{formatDate(r.createdAt)}</span>
                    <span><span className={`badge ${VENDOR_BADGE[r.status]}`}>{r.status}</span></span>
                    <span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setOpenId(isOpen ? null : it.id)}
                      >
                        {isOpen ? 'Close' : 'Review'}
                      </button>
                    </span>
                  </div>

                  {isOpen && (
                    <div className="admin-detail">
                      <h3>Business</h3>
                      <div className="detail-grid">
                        <div><strong>Name</strong>{r.businessName}</div>
                        <div><strong>Category</strong>{r.category}</div>
                        <div><strong>Area</strong>{r.area}</div>
                        <div><strong>Business phone</strong>{r.contactPhone || '—'}</div>
                        <div><strong>CAC registered?</strong>{r.cacRegistered || '—'}</div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong>Address</strong>{r.address}
                        </div>
                      </div>

                      {(r.storefrontPhoto || r.goodsPhoto) && (
                        <>
                          <h3>Photos</h3>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {r.storefrontPhoto && <FileLink label="Store front" file={r.storefrontPhoto} />}
                            {r.goodsPhoto && <FileLink label="Goods inside" file={r.goodsPhoto} />}
                          </div>
                        </>
                      )}

                      <h3>Owner</h3>
                      <div className="detail-grid">
                        <div><strong>Name</strong>{r.ownerName}</div>
                        <div><strong>Phone</strong>{r.ownerPhone}</div>
                        <div><strong>Email</strong>{r.ownerEmail}</div>
                      </div>

                      {r.notes && (
                        <>
                          <h3>Notes from applicant</h3>
                          <p style={{ marginBottom: '0.5rem' }}>{r.notes}</p>
                        </>
                      )}

                      {r.status === 'approved' && r.approvedVendor && (
                        <div className="alert alert-success">
                          Approved · partner code <strong>{r.approvedVendor.partnerCode}</strong>.
                        </div>
                      )}
                      {r.status === 'rejected' && r.adminNote && (
                        <div className="alert alert-error">
                          Rejected · <em>"{r.adminNote}"</em>
                        </div>
                      )}

                      {r.status === 'pending' && (
                        <>
                          <h3>Decision</h3>
                          <div className="form-group">
                            <label htmlFor={`note-${it.id}`}>
                              Note <span style={{ color: 'var(--gf-muted)', fontWeight: 400 }}>· required when rejecting</span>
                            </label>
                            <textarea
                              id={`note-${it.id}`}
                              value={noteDraft[it.id] ?? r.adminNote ?? ''}
                              onChange={(e) => setNoteDraft((p) => ({ ...p, [it.id]: e.target.value }))}
                            />
                          </div>
                          <div className="action-bar">
                            <button
                              type="button"
                              className="btn btn-success"
                              disabled={actingId === it.id}
                              onClick={() => approvePartner(r)}
                            >
                              {actingId === it.id ? <span className="spinner" /> : 'Approve & create vendor'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={actingId === it.id}
                              onClick={() => rejectPartner(r)}
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
            }
            // contact
            const c = it.data;
            return (
              <div key={it.id}>
                <div className="admin-row">
                  <span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className="badge badge-received">User</span>
                      <strong>{c.subject || 'Contact enquiry'}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gf-muted)' }}>
                      {c.message.slice(0, 80)}{c.message.length > 80 ? '…' : ''}
                    </div>
                  </span>
                  <span>
                    <div>{c.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gf-muted)' }}>{c.email}</div>
                  </span>
                  <span>{formatDate(c.createdAt)}</span>
                  <span>
                    <span className={`badge ${c.status === 'resolved' ? 'badge-approved' : 'badge-processing'}`}>
                      {c.status}
                    </span>
                  </span>
                  <span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setOpenId(isOpen ? null : it.id)}
                    >
                      {isOpen ? 'Close' : 'Review'}
                    </button>
                  </span>
                </div>

                {isOpen && (
                  <div className="admin-detail">
                    <h3>From</h3>
                    <div className="detail-grid">
                      <div><strong>Name</strong>{c.name}</div>
                      <div><strong>Email</strong><a href={`mailto:${c.email}`}>{c.email}</a></div>
                      <div><strong>Phone</strong>{c.phone || '—'}</div>
                      <div><strong>Subject</strong>{c.subject || '—'}</div>
                    </div>

                    <h3>Message</h3>
                    <p style={{ whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{c.message}</p>

                    {c.adminNote && (
                      <>
                        <h3>Internal note</h3>
                        <p style={{ marginBottom: '0.5rem', fontStyle: 'italic' }}>{c.adminNote}</p>
                      </>
                    )}

                    <h3>Decision</h3>
                    <div className="form-group">
                      <label htmlFor={`cnote-${it.id}`}>Internal note (optional)</label>
                      <textarea
                        id={`cnote-${it.id}`}
                        value={noteDraft[it.id] ?? c.adminNote ?? ''}
                        onChange={(e) => setNoteDraft((p) => ({ ...p, [it.id]: e.target.value }))}
                      />
                    </div>
                    <div className="action-bar">
                      <a href={`mailto:${c.email}`} className="btn btn-secondary">
                        Reply by email
                      </a>
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
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Keep the old export name working for any existing imports
export { AdminRequests as AdminVendorRequests };
