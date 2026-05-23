import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { vendorRequestsApi } from '../api/vendorRequests';
import { extractApiError } from '../api/client';
import { VENDOR_CATEGORIES, VendorCategory } from '../types';

export function Partner() {
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    area: '',
    category: 'Grocery' as VendorCategory,
    contactPhone: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value as typeof prev[typeof k] }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.businessName.trim()) return setError('Business name is required');
    if (!form.address.trim()) return setError('Business address is required');
    if (!form.area.trim()) return setError('Area is required');
    if (!form.ownerName.trim()) return setError('Owner full name is required');
    if (!form.ownerPhone.trim()) return setError('Owner phone is required');
    if (!/^\S+@\S+\.\S+$/.test(form.ownerEmail)) return setError('Enter a valid owner email');

    setSubmitting(true);
    try {
      await vendorRequestsApi.submit({
        businessName: form.businessName.trim(),
        address: form.address.trim(),
        area: form.area.trim(),
        category: form.category,
        contactPhone: form.contactPhone.trim(),
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        notes: form.notes.trim(),
      });
      toast.success('Partner request submitted');
      setSent(true);
      setForm({
        businessName: '',
        address: '',
        area: '',
        category: 'Grocery',
        contactPhone: '',
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
        notes: '',
      });
    } catch (err) {
      setError(extractApiError(err, 'Could not submit your request right now'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="container-sm page">
        <div className="card">
          <h1 style={{ fontSize: '1.5rem' }}>Thanks for your interest</h1>
          <p>
            We've received your request to partner with Esena Africa. Our team will review it and reach
            out to the owner email you provided within a few business days.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/" className="btn">Back home</Link>
            <button type="button" className="btn btn-ghost" onClick={() => setSent(false)}>
              Submit another request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-sm page">
      <div className="page-title" style={{ marginBottom: '1rem' }}>
        <h1>Partner with us</h1>
        <p>
          Run a pharmacy or grocery store? Apply to become an Esena Africa partner. Our admins review
          every request and will get in touch by email.
        </p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="section-title">Business</div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="businessName">Business name</label>
              <input id="businessName" value={form.businessName} onChange={update('businessName')} />
            </div>
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as VendorCategory })}
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Business address</label>
            <textarea id="address" value={form.address} onChange={update('address')} rows={2} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="area">Area</label>
              <input
                id="area"
                value={form.area}
                onChange={update('area')}
                placeholder="e.g. Ojodu Berger"
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactPhone">Business phone</label>
              <input
                id="contactPhone"
                inputMode="tel"
                value={form.contactPhone}
                onChange={update('contactPhone')}
              />
              <span className="field-help">Optional</span>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: '1rem' }}>Owner</div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ownerName">Owner full name</label>
              <input id="ownerName" value={form.ownerName} onChange={update('ownerName')} />
            </div>
            <div className="form-group">
              <label htmlFor="ownerPhone">Owner phone</label>
              <input
                id="ownerPhone"
                inputMode="tel"
                value={form.ownerPhone}
                onChange={update('ownerPhone')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ownerEmail">Owner email</label>
            <input
              id="ownerEmail"
              type="email"
              value={form.ownerEmail}
              onChange={update('ownerEmail')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Anything else we should know?</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={update('notes')}
              rows={3}
              placeholder="Optional — opening hours, branches, etc."
            />
          </div>

          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Submit partner request'}
          </button>
          <Link to="/" className="btn btn-ghost" style={{ marginLeft: '0.5rem' }}>
            Back home
          </Link>
        </form>
      </div>
    </div>
  );
}
