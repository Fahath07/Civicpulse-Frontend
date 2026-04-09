import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { toast } from 'react-toastify';
import './AdminIssues.css';

const STATUSES = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
const CATEGORIES = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Drainage', 'Construction', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function AdminIssues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', ward: '', from: '', to: '', assigned: '' });
  const [selected, setSelected] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [bulkWorker, setBulkWorker] = useState('');

  useEffect(() => {
    api.get('/admin/fieldworkers').then(r => setWorkers(r.data.workers || []));
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [page, filters]);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
      const res = await api.get(`/admin/issues?${params}`);
      setIssues(res.data.issues || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } finally { setLoading(false); }
  }, [page, filters]);

  const handleBulkAction = async (action) => {
    if (!selected.length) return;
    try {
      await api.patch('/admin/issues/bulk', { ids: selected, action, assignedToId: bulkWorker || undefined });
      toast.success('Bulk action applied');
      setSelected([]);
      fetchIssues();
    } catch { toast.error('Bulk action failed'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/issues/${id}/status`, { status });
      setIssues(p => p.map(i => i.id === id ? { ...i, status } : i));
    } catch { toast.error('Status update failed'); }
  };

  const handleAssign = async (id, workerId) => {
    try {
      await api.post('/admin/assign', { issueId: id, workerId });
      setIssues(p => p.map(i => i.id === id ? { ...i, assignedToId: workerId } : i));
      toast.success('Assigned');
    } catch { toast.error('Assignment failed'); }
  };

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === issues.length ? [] : issues.map(i => i.id));

  return (
    <div className="admin-root">
      <Navbar />
      <div style={{ display: 'flex', flex: 1, background: 'var(--bg)', minHeight: 'calc(100vh - var(--navbar-h))' }}>
      <aside className="admin-sidebar">
        <div className="sidebar-logo">CivicPulse</div>
        <NavLink to="/admin" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <span>📊</span> Dashboard
        </NavLink>
        <NavLink to="/admin/issues" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <span>📋</span> All Issues
        </NavLink>
      </aside>
      <div className="admin-issues-page">
      <div className="ai-header">
        <h1 className="admin-page-title">All Issues</h1>
        <div className="ai-header-actions">
          <button className="btn-ghost" onClick={() => setShowFilters(v => !v)}>
            {showFilters ? 'Hide Filters' : 'Filters'} ▾
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel-adv">
          <div className="filter-row">
            {[
              { label: 'Status', key: 'status', options: STATUSES },
              { label: 'Category', key: 'category', options: CATEGORIES },
              { label: 'Priority', key: 'priority', options: PRIORITIES },
            ].map(f => (
              <div key={f.key} className="filter-field">
                <label>{f.label}</label>
                <select className="input-field" value={filters[f.key]} onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}>
                  <option value="">All</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="filter-field">
              <label>Ward</label>
              <input className="input-field" placeholder="Ward name" value={filters.ward} onChange={e => setFilters(p => ({ ...p, ward: e.target.value }))} />
            </div>
            <div className="filter-field">
              <label>From</label>
              <input className="input-field" type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
            </div>
            <div className="filter-field">
              <label>To</label>
              <input className="input-field" type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
            </div>
          </div>
          <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => { setFilters({ status: '', category: '', priority: '', ward: '', from: '', to: '', assigned: '' }); setPage(1); }}>
            Clear Filters
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="bulk-bar">
          <span>{selected.length} selected</span>
          <select className="input-field" style={{ width: 180 }} value={bulkWorker} onChange={e => setBulkWorker(e.target.value)}>
            <option value="">Select worker...</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button className="btn-primary" style={{ fontSize: 12, padding: '6px 16px' }} onClick={() => handleBulkAction('assign')}>Assign</button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 16px' }} onClick={() => handleBulkAction('resolve')}>Mark Resolved</button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 16px' }} onClick={() => handleBulkAction('close')}>Mark Closed</button>
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 16px', color: 'var(--red)' }} onClick={() => handleBulkAction('escalate')}>Escalate Critical</button>
        </div>
      )}

      <div className="table-card">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selected.length === issues.length && issues.length > 0} onChange={toggleAll} /></th>
                <th>Issue / Ward</th><th>Category</th><th>Priority</th>
                <th>Status</th><th>Votes</th><th>Assigned To</th><th>SLA</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Loading...</td></tr>
              ) : issues.map(issue => (
                <tr key={issue.id} onClick={() => navigate(`/issues/${issue.id}`)} style={{ cursor: 'pointer' }}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(issue.id)} onChange={() => toggleSelect(issue.id)} />
                  </td>
                  <td>
                    <p className="table-title">{issue.title}</p>
                    <p className="table-sub">{issue.ward}</p>
                  </td>
                  <td>{issue.category}</td>
                  <td><StatusBadge status={issue.priority} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <select className="status-select" value={issue.status} onChange={e => handleStatusChange(issue.id, e.target.value)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{issue.voteCount || 0}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <select className="assign-select" value={issue.assignedToId || ''} onChange={e => handleAssign(issue.id, e.target.value)}>
                      <option value="">Unassigned</option>
                      {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </td>
                  <td className={issue.slaDeadline && new Date(issue.slaDeadline) < new Date() ? 'sla-breached' : ''}>
                    {issue.slaDeadline ? new Date(issue.slaDeadline).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="page-info">{total} total issues</span>
          <div className="page-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
