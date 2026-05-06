import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { vendorsApi } from '../api/vendors';
import { extractApiError } from '../api/client';
import { Vendor, VendorCategory, VENDOR_CATEGORIES } from '../types';
import { formatDate } from '../utils/format';

type Filter = 'all' | VendorCategory | 'inactive';

export function AdminVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    contactPhone: '',
    area: '',
    category: 'Pharmacy' as VendorCategory,
    partnerCode: '',
    ownerName: '',
    ownerPhone: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    vendorsApi
      .list({ includeInactive: true })
      .then((list) => !cancelled && setVendors(list))
      .catch((err) => !cancelled && setError(extractApiError(err, 'Could not load vendors')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (filter === 'inactive' && v.active) return false;
      if (filter !== 'all' && filter !== 'inactive' && v.category !== filter) return false;
      if (filter === 'all' && !v.active) return false;
      if (!term) return true;
      return (
        v.businessName.toLowerCase().includes(term) ||
        v.partnerCode.toLowerCase().includes(term) ||
        v.area.toLowerCase().includes(term) ||
        v.address.toLowerCase().includes(term)
      );
    });
  }, [vendors, filter, search]);

  const counts = useMemo(() => {
    const c = { all: 0, Pharmacy: 0, Grocery: 0, inactive: 0 };
    vendors.forEach((v) => {
      if (!v.active) c.inactive++;
      else {
        c.all++;
        c[v.category]++;
      }
    });
    return c;
  }, [vendors]);

  const resetForm = () => {
    setForm({
      businessName: '',
      address: '',
      contactPhone: '',
      area: '',
      category: 'Pharmacy',
      partnerCode: '',
      ownerName: '',
      ownerPhone: '',
    });
    setEditing(null);
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({
      businessName: v.businessName,
      address: v.address,
      contactPhone: v.contactPhone,
      area: v.area,
      category: v.category,
      partnerCode: v.partnerCode,
      ownerName: v.ownerName || '',
      ownerPhone: v.ownerPhone || '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.businessName.trim() || !form.address.trim() || !form.area.trim()) {
      return setFormError('Business name, address, and area are required');
    }
    if (!form.ownerName.trim() || !form.ownerPhone.trim()) {
      return setFormError('Owner name and owner phone are required');
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await vendorsApi.update(editing._id, {
          businessName: form.businessName.trim(),
          address: form.address.trim(),
          contactPhone: form.contactPhone.trim(),
          area: form.area.trim(),
          category: form.category,
          ownerName: form.ownerName.trim(),
          ownerPhone: form.ownerPhone.trim(),
        });
        setVendors((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
        toast.success('Vendor updated');
      } else {
        const created = await vendorsApi.create({
          businessName: form.businessName.trim(),
          address: form.address.trim(),
          contactPhone: form.contactPhone.trim(),
          area: form.area.trim(),
          category: form.category,
          partnerCode: form.partnerCode.trim() || undefined,
          ownerName: form.ownerName.trim(),
          ownerPhone: form.ownerPhone.trim(),
        });
        setVendors((prev) => [created, ...prev]);
        toast.success(`Vendor onboarded · ${created.partnerCode}`);
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(extractApiError(err, 'Could not save vendor'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (v: Vendor) => {
    setActingId(v._id);
    try {
      const updated = await vendorsApi.update(v._id, { active: !v.active });
      setVendors((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      toast.success(updated.active ? 'Vendor activated' : 'Vendor deactivated');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not update vendor'));
    } finally {
      setActingId(null);
    }
  };

  const handleRemove = async (v: Vendor) => {
    if (!window.confirm(`Permanently remove ${v.businessName}? Use Deactivate if you might re-enable later.`)) return;
    setActingId(v._id);
    try {
      await vendorsApi.remove(v._id);
      setVendors((prev) => prev.filter((x) => x._id !== v._id));
      toast.success('Vendor removed');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not remove vendor'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>Admin · Vendors</h1>
          <p>Onboard partner pharmacies and grocery stores. Customers pick from active vendors when applying.</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          Onboard vendor
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>{editing ? `Edit ${editing.partnerCode}` : 'New vendor'}</h2>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessName">Business name</label>
                <input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                />
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
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="area">Area</label>
                <input
                  id="area"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="e.g. Ojodu Berger"
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactPhone">Business phone</label>
                <input
                  id="contactPhone"
                  inputMode="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
                <span className="field-help">Optional · Used for store enquiries</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ownerName">Owner full name</label>
                <input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="e.g. Adebayo Adeyemi"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ownerPhone">Owner personal phone</label>
                <input
                  id="ownerPhone"
                  inputMode="tel"
                  value={form.ownerPhone}
                  onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                  placeholder="e.g. 08012345678"
                />
              </div>
            </div>
            {!editing && (
              <div className="form-group">
                <label htmlFor="partnerCode">Partner code</label>
                <input
                  id="partnerCode"
                  value={form.partnerCode}
                  onChange={(e) => setForm({ ...form, partnerCode: e.target.value.toUpperCase() })}
                  placeholder="Auto-generated if blank (e.g. GR0030)"
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? <span className="spinner" /> : editing ? 'Save changes' : 'Create vendor'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { resetForm(); setShowForm(false); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-toolbar">
        {(['all', 'Pharmacy', 'Grocery', 'inactive'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Active' : f === 'inactive' ? 'Inactive' : f}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>· {counts[f as keyof typeof counts]}</span>
          </button>
        ))}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code, area…"
          style={{ marginLeft: 'auto', minWidth: 220 }}
          aria-label="Search vendors"
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}>
            <span className="spinner dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="list-empty">
            <h3>No vendors match</h3>
            <p>Try a different filter or onboard a new vendor.</p>
          </div>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th>Code</th>
                <th>Business</th>
                <th>Category</th>
                <th>Area</th>
                <th>Phone</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v._id} style={{ opacity: v.active ? 1 : 0.55 }}>
                  <td><code>{v.partnerCode}</code></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.businessName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gf-muted)' }}>{v.address}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gf-muted)', marginTop: 2 }}>
                      Owner: {v.ownerName || '—'}{v.ownerPhone && ` · ${v.ownerPhone}`}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${v.category === 'Pharmacy' ? 'badge-processing' : 'badge-approved'}`}>
                      {v.category}
                    </span>
                  </td>
                  <td>{v.area}</td>
                  <td>{v.contactPhone || '—'}</td>
                  <td>{v.createdAt ? formatDate(v.createdAt) : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginRight: 4 }}
                      onClick={() => openEdit(v)}
                      disabled={actingId === v._id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginRight: 4 }}
                      onClick={() => toggleActive(v)}
                      disabled={actingId === v._id}
                    >
                      {v.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleRemove(v)}
                      disabled={actingId === v._id}
                    >
                      Remove
                    </button>
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
