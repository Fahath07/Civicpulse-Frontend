import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import Navbar from '../../components/Navbar/Navbar';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { toast } from 'react-toastify';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const WARDS = ['Ward 1','Ward 2','Ward 3','Ward 4','Ward 5','Ward 6','Ward 7','Ward 8','Ward 9','Ward 10'];

const SIDEBAR_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/issues', label: 'All Issues', icon: '📋' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [issues, setIssues] = useState([]);
  const [search, setSearch] = useState('');
  const [workers, setWorkers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard' | 'fieldworkers'
  const [form, setForm] = useState({ name: '', email: '', phone: '', ward: '', password: '', confirmPassword: '' });
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const socket = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/admin/issues?limit=10').then(r => setIssues(r.data.issues || []));
    fetchWorkers();
  }, []);

  const fetchWorkers = () => {
    api.get('/admin/fieldworkers').then(r => setWorkers(r.data.workers || []));
  };

  useEffect(() => {
    if (!socket) return;
    socket.on('issue:new', ({ issue, ward }) => {
      setStats(p => ({ ...p, total: (p.total || 0) + 1, open: (p.open || 0) + 1 }));
      setIssues(p => [issue, ...p.slice(0, 9)]);
      toast.info(`New issue reported in ${ward}`);
    });
    socket.on('sla:breach', ({ title }) => toast.warn(`SLA breach: ${title}`));
    return () => { socket.off('issue:new'); socket.off('sla:breach'); };
  }, [socket]);

  const validateForm = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.ward) e.ward = 'Ward is required';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setCreating(true);
    try {
      await api.post('/admin/fieldworkers', {
        name: form.name, email: form.email, phone: form.phone,
        ward: form.ward, password: form.password,
      });
      toast.success(`Field worker account created for ${form.name}`);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', ward: '', password: '', confirmPassword: '' });
      setFormErrors({});
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete field worker account for ${name}?`)) return;
    try {
      await api.delete(`/admin/fieldworkers/${id}`);
      toast.success('Field worker account deleted');
      fetchWorkers();
    } catch { toast.error('Delete failed'); }
  };

  const exportCSV = () => {
    const headers = ['Title', 'Category', 'Priority', 'Status', 'Ward', 'Votes', 'Created'];
    const rows = issues.map(i => [i.title, i.category, i.priority, i.status, i.ward, i.voteCount, new Date(i.createdAt).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'issues.csv'; a.click();
  };

  const filtered = issues.filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.ward?.toLowerCase().includes(search.toLowerCase()));

  const barData = {
    labels: (stats.byDept || []).map(d => d.department || 'Unknown'),
    datasets: [{ label: 'Issues', data: (stats.byDept || []).map(d => parseInt(d.count)), backgroundColor: '#0F2D1F', borderRadius: 6 }],
  };

  const doughnutData = {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{ data: [stats.open || 0, stats.inProgress || 0, stats.resolved || 0, (stats.total || 0) - (stats.open || 0) - (stats.inProgress || 0) - (stats.resolved || 0)], backgroundColor: ['#1A3A5C', '#8A5800', '#1A5828', '#8A8480'], borderWidth: 0 }],
  };

  const KPI_CARDS = [
    { label: 'Total Issues', value: stats.total || 0, color: 'var(--accent)' },
    { label: 'Open', value: stats.open || 0, color: 'var(--blue)' },
    { label: 'In Progress', value: stats.inProgress || 0, color: 'var(--amber)' },
    { label: 'Resolved', value: stats.resolved || 0, color: 'var(--green)' },
    { label: 'SLA Breach', value: stats.slaBreached || 0, color: 'var(--red)' },
  ];

  return (
    <div className="admin-root">
      <Navbar />
      <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">CivicPulse</div>
        {SIDEBAR_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <span>{item.icon}</span> {item.label}
          </NavLink>
        ))}
        <div className="sidebar-sep" />
        <button
          className={`sidebar-item ${activeSection === 'fieldworkers' ? 'active' : ''}`}
          onClick={() => setActiveSection(activeSection === 'fieldworkers' ? 'dashboard' : 'fieldworkers')}
          style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: 'none' }}
        >
          <span>👷</span> Field Workers
          <span className="sidebar-badge">{workers.length}</span>
        </button>
      </aside>

      <main className="admin-main">

        {/* ── FIELD WORKERS SECTION ── */}
        {activeSection === 'fieldworkers' && (
          <div>
            <div className="admin-topbar">
              <div>
                <h1 className="admin-page-title">Field Workers</h1>
                <p className="admin-date">Manage field worker accounts</p>
              </div>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                + Create Field Worker
              </button>
            </div>

            <div className="admin-card">
              {workers.length === 0 ? (
                <div className="fw-empty">
                  <p className="fw-empty-icon">👷</p>
                  <p className="fw-empty-title">No field workers yet</p>
                  <p className="fw-empty-sub">Create accounts for your field workers so they can receive and resolve assigned issues.</p>
                  <button className="btn-primary" onClick={() => setShowModal(true)}>+ Create First Field Worker</button>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Ward</th><th>Phone</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {workers.map(w => (
                        <tr key={w.id}>
                          <td>
                            <div className="worker-row">
                              <div className="worker-avatar-sm">{w.name?.split(' ').map(x => x[0]).join('').toUpperCase().slice(0,2)}</div>
                              <span className="table-title">{w.name}</span>
                            </div>
                          </td>
                          <td>{w.email}</td>
                          <td>{w.ward || '—'}</td>
                          <td>{w.phone || '—'}</td>
                          <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button className="action-btn-delete" onClick={() => handleDelete(w.id, w.name)}>🗑 Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DASHBOARD SECTION ── */}
        {activeSection === 'dashboard' && (
          <>
            <div className="admin-topbar">
              <div>
                <h1 className="admin-page-title">Admin Dashboard</h1>
                <p className="admin-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="admin-topbar-actions">
                <button className="btn-ghost" onClick={exportCSV}>Export CSV</button>
                <button className="btn-primary" onClick={() => setActiveSection('fieldworkers')}>+ Field Worker</button>
              </div>
            </div>

            <div className="kpi-row">
              {KPI_CARDS.map(k => (
                <div key={k.label} className="kpi-card" style={{ borderTopColor: k.color }}>
                  <span className="kpi-num" style={{ color: k.color }}>{k.value}</span>
                  <span className="kpi-label">{k.label}</span>
                </div>
              ))}
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Recent Issues</h2>
                <input className="input-field" placeholder="Search..." value={search}
                  onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
              </div>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Issue / Ward</th><th>Category</th><th>Priority</th><th>Status</th>
                      <th>Votes</th><th>Assigned To</th><th>SLA</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(issue => (
                      <tr key={issue.id} onClick={() => navigate(`/issues/${issue.id}`)} style={{ cursor: 'pointer' }}>
                        <td>
                          <p className="table-title">{issue.title}</p>
                          <p className="table-sub">{issue.ward}</p>
                        </td>
                        <td>{issue.category}</td>
                        <td><StatusBadge status={issue.priority} /></td>
                        <td><StatusBadge status={issue.status} /></td>
                        <td>{issue.voteCount || 0}</td>
                        <td>{issue.assignedTo?.name || '—'}</td>
                        <td className={issue.slaDeadline && new Date(issue.slaDeadline) < new Date() ? 'sla-breached' : ''}>
                          {issue.slaDeadline ? new Date(issue.slaDeadline).toLocaleDateString() : '—'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="table-actions">
                            <button className="action-btn" onClick={() => navigate(`/issues/${issue.id}`)}>👁</button>
                            <button className="action-btn" onClick={() => navigate('/admin/issues')}>✏️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="charts-row">
              <div className="admin-card chart-card">
                <h2 className="admin-card-title">Issues by Department</h2>
                <Bar data={barData} options={{ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }} />
              </div>
              <div className="admin-card chart-card">
                <h2 className="admin-card-title">Status Breakdown</h2>
                <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } }, cutout: '65%' }} />
              </div>
            </div>

            <div className="bottom-metrics">
              <div className="admin-card metric-card">
                <p className="metric-label">Avg Resolution Time</p>
                <p className="metric-value">{stats.avgDays || 0} days</p>
              </div>
              <div className="admin-card metric-card">
                <p className="metric-label">Top Reported Wards</p>
                {(stats.wards || []).map((w, i) => (
                  <div key={i} className="ward-row">
                    <span>{i + 1}. {w.ward || 'Unknown'}</span>
                    <span className="ward-count">{w.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      </div>

      {/* ── CREATE FIELD WORKER MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Field Worker Account</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p className="modal-subtitle">The field worker will use these credentials to log in and manage assigned tasks.</p>

            <form onSubmit={handleCreate} className="modal-form">
              <div className="modal-form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className={`input-field ${formErrors.name ? 'input-error' : ''}`}
                    placeholder="John Smith"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input className={`input-field ${formErrors.email ? 'input-error' : ''}`}
                    type="email" placeholder="worker@example.com"
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                </div>
              </div>

              <div className="modal-form-row">
                <div className="form-group">
                  <label>Phone <span className="optional">(optional)</span></label>
                  <input className="input-field" placeholder="+91 98765 43210"
                    value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Assigned Ward</label>
                  <select className={`input-field ${formErrors.ward ? 'input-error' : ''}`}
                    value={form.ward} onChange={e => setForm(p => ({ ...p, ward: e.target.value }))}>
                    <option value="">Select ward</option>
                    {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {formErrors.ward && <span className="field-error">{formErrors.ward}</span>}
                </div>
              </div>

              <div className="modal-form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input className={`input-field ${formErrors.password ? 'input-error' : ''}`}
                    type="password" placeholder="Min. 8 characters"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  {formErrors.password && <span className="field-error">{formErrors.password}</span>}
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input className={`input-field ${formErrors.confirmPassword ? 'input-error' : ''}`}
                    type="password" placeholder="Repeat password"
                    value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                  {formErrors.confirmPassword && <span className="field-error">{formErrors.confirmPassword}</span>}
                </div>
              </div>

              <div className="modal-info">
                <span>🔧</span>
                <p>This account will have the <strong>Field Worker</strong> role. They can log in at the login page using the <strong>Field Worker</strong> tab.</p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <><span className="spinner" /> Creating...</> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}