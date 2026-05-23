import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { impactStatsApi } from '../api/impactStats';
import { extractApiError } from '../api/client';
import { ImpactStat, StatIcon as StatIconType, STAT_ICONS } from '../types';
import { StatIcon } from '../components/StatIcon';

interface RowEdit {
  label: string;
  value: string;
  icon: StatIconType;
  order: number;
  active: boolean;
}

export function AdminImpactStats() {
  const [stats, setStats] = useState<ImpactStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    key: '',
    label: '',
    value: '',
    icon: 'chart' as StatIconType,
    order: 0,
  });

  useEffect(() => {
    let cancelled = false;
    impactStatsApi
      .listAll()
      .then((list) => !cancelled && setStats(list))
      .catch((err) => !cancelled && setError(extractApiError(err, 'Could not load stats')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const draftOf = (s: ImpactStat): RowEdit =>
    edits[s._id] ?? {
      label: s.label,
      value: s.value,
      icon: s.icon,
      order: s.order,
      active: s.active,
    };

  const setDraft = (id: string, patch: Partial<RowEdit>) =>
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? stats.find((s) => s._id === id)!), ...patch },
    }));

  const saveRow = async (s: ImpactStat) => {
    const d = draftOf(s);
    setActingId(s._id);
    try {
      const updated = await impactStatsApi.update(s._id, d);
      setStats((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[s._id];
        return next;
      });
      toast.success('Saved');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not save'));
    } finally {
      setActingId(null);
    }
  };

  const removeRow = async (s: ImpactStat) => {
    if (!window.confirm(`Delete "${s.label}"?`)) return;
    setActingId(s._id);
    try {
      await impactStatsApi.remove(s._id);
      setStats((prev) => prev.filter((x) => x._id !== s._id));
      toast.success('Removed');
    } catch (err) {
      toast.error(extractApiError(err, 'Could not remove'));
    } finally {
      setActingId(null);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.key.trim() || !createForm.label.trim() || !createForm.value.trim()) {
      return setCreateError('Key, label, and value are required');
    }
    setCreating(true);
    try {
      const created = await impactStatsApi.create({
        key: createForm.key.trim(),
        label: createForm.label.trim(),
        value: createForm.value.trim(),
        icon: createForm.icon,
        order: createForm.order,
      });
      setStats((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setCreateForm({ key: '', label: '', value: '', icon: 'chart', order: 0 });
      setShowCreate(false);
      toast.success('Stat added');
    } catch (err) {
      setCreateError(extractApiError(err, 'Could not create stat'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <div className="page-title">
          <h1>Admin · Impact stats</h1>
          <p>Numbers shown on the public homepage. Changes go live as soon as you save.</p>
        </div>
        <button type="button" className="btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : 'Add stat'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showCreate && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>New stat</h2>
          {createError && <div className="alert alert-error">{createError}</div>}
          <form onSubmit={handleCreate} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="key">Key</label>
                <input
                  id="key"
                  value={createForm.key}
                  onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })}
                  placeholder="e.g. customers_served"
                />
                <span className="field-help">Unique short ID (lowercase, no spaces)</span>
              </div>
              <div className="form-group">
                <label htmlFor="order">Order</label>
                <input
                  id="order"
                  type="number"
                  value={createForm.order}
                  onChange={(e) => setCreateForm({ ...createForm, order: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="label">Label</label>
                <input
                  id="label"
                  value={createForm.label}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  placeholder="e.g. Customers served"
                />
              </div>
              <div className="form-group">
                <label htmlFor="value">Value</label>
                <input
                  id="value"
                  value={createForm.value}
                  onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
                  placeholder="e.g. 1,900+"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="icon">Icon</label>
              <select
                id="icon"
                value={createForm.icon}
                onChange={(e) =>
                  setCreateForm({ ...createForm, icon: e.target.value as StatIconType })
                }
              >
                {STAT_ICONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn" disabled={creating}>
              {creating ? <span className="spinner" /> : 'Create stat'}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: '3rem' }}>
            <span className="spinner dark" />
          </div>
        ) : stats.length === 0 ? (
          <div className="list-empty">
            <h3>No stats yet</h3>
            <p>Add one to start showing impact numbers on the homepage.</p>
          </div>
        ) : (
          <table className="simple">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Key</th>
                <th>Value</th>
                <th>Label</th>
                <th>Order</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const d = draftOf(s);
                const dirty = !!edits[s._id];
                return (
                  <tr key={s._id} style={{ opacity: s.active ? 1 : 0.55 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="impact-icon" style={{ width: 32, height: 32 }}>
                          <StatIcon icon={d.icon} size={18} />
                        </span>
                        <select
                          aria-label="Icon"
                          value={d.icon}
                          onChange={(e) => setDraft(s._id, { icon: e.target.value as StatIconType })}
                        >
                          {STAT_ICONS.map((i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td><code>{s.key}</code></td>
                    <td>
                      <input
                        value={d.value}
                        onChange={(e) => setDraft(s._id, { value: e.target.value })}
                        style={{ width: 110 }}
                      />
                    </td>
                    <td>
                      <input
                        value={d.label}
                        onChange={(e) => setDraft(s._id, { label: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={d.order}
                        onChange={(e) => setDraft(s._id, { order: Number(e.target.value) })}
                        style={{ width: 60 }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={d.active}
                        onChange={(e) => setDraft(s._id, { active: e.target.checked })}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginRight: 4 }}
                        disabled={!dirty || actingId === s._id}
                        onClick={() => saveRow(s)}
                      >
                        {actingId === s._id ? <span className="spinner" /> : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={actingId === s._id}
                        onClick={() => removeRow(s)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
