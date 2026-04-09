import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar/Navbar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './FieldWorkerDashboard.css';

const PRIORITY_CONFIG = {
  Critical: { color: 'var(--red)',    bg: 'var(--red-light)',    label: '🔴 Critical' },
  High:     { color: 'var(--orange)', bg: 'var(--orange-light)', label: '🟠 High' },
  Medium:   { color: 'var(--amber)',  bg: 'var(--amber-light)',  label: '🟡 Medium' },
  Low:      { color: 'var(--green)',  bg: 'var(--green-light)',  label: '🟢 Low' },
};
const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function FieldWorkerDashboard() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [tab, setTab] = useState('tasks');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState({});
  const [resPhotos, setResPhotos] = useState({});
  const [submitting, setSubmitting] = useState({});
  const mapRef = useRef();
  const mapInstance = useRef();

  useEffect(() => {
    api.get('/issues/assigned').then(r => {
      const sorted = (r.data.issues || []).sort((a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3));
      setIssues(sorted);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('issue:assigned', ({ issue }) => {
      setIssues(p => [issue, ...p]);
      toast.info(`New task: ${issue.title}`);
    });
    return () => socket.off('issue:assigned');
  }, [socket]);

  useEffect(() => {
    if (tab !== 'map' || !mapRef.current || mapRef.current._leaflet_id) return;
    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'), iconUrl: require('leaflet/dist/images/marker-icon.png'), shadowUrl: require('leaflet/dist/images/marker-shadow.png') });
      const map = L.map(mapRef.current).setView([13.0827, 80.2707], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      issues.filter(i => i.latitude && i.longitude).forEach(issue => {
        L.marker([issue.latitude, issue.longitude]).addTo(map).bindPopup(`<b>${issue.title}</b>`);
      });
      mapInstance.current = map;
    });
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [tab, issues]);

  const handleStatusUpdate = async (issue, status) => {
    if (status === 'Resolved' && !resPhotos[issue.id]) {
      toast.warn('Please upload a resolution photo first');
      return;
    }
    setSubmitting(p => ({ ...p, [issue.id]: true }));
    try {
      const fd = new FormData();
      fd.append('status', status);
      if (notes[issue.id]) fd.append('note', notes[issue.id]);
      if (resPhotos[issue.id]) fd.append('resolutionPhotos', resPhotos[issue.id]);
      await api.patch(`/issues/${issue.id}/status`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setIssues(p => p.map(i => i.id === issue.id ? { ...i, status: status === 'Resolved' ? 'Pending Verification' : status } : i));
      toast.success(`Updated to ${status}`);
      setExpandedId(null);
    } catch { toast.error('Update failed'); }
    finally { setSubmitting(p => ({ ...p, [issue.id]: false })); }
  };

  const done = issues.filter(i => ['Resolved', 'Pending Verification'].includes(i.status)).length;
  const active = issues.filter(i => !['Resolved', 'Pending Verification', 'Closed'].includes(i.status)).length;

  return (
    <div className="fw-page">
      <Navbar />

      {tab === 'tasks' && (
        <div className="fw-content">
          <div className="fw-hero">
            <div className="fw-hero-inner">
              <div>
                <h1 className="fw-hero-title">My Tasks</h1>
                <p className="fw-hero-sub">{user?.ward} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
              <div className="fw-hero-stats">
                <div className="fw-stat-pill">
                  <span className="fw-stat-num">{active}</span>
                  <span className="fw-stat-lbl">Active</span>
                </div>
                <div className="fw-stat-pill">
                  <span className="fw-stat-num">{done}</span>
                  <span className="fw-stat-lbl">Done</span>
                </div>
                <div className="fw-stat-pill">
                  <span className="fw-stat-num">{issues.length}</span>
                  <span className="fw-stat-lbl">Total</span>
                </div>
              </div>
            </div>
            <div className="fw-progress-bar-wrap">
              <div className="fw-progress-bar" style={{ width: issues.length ? `${(done / issues.length) * 100}%` : '0%' }} />
            </div>
            <p className="fw-progress-label">{done} of {issues.length} tasks completed</p>
          </div>

          <div className="fw-tasks">
            {loading ? (
              <div className="fw-loading">Loading tasks...</div>
            ) : issues.length === 0 ? (
              <div className="fw-empty">
                <span className="fw-empty-icon">✅</span>
                <p>No tasks assigned yet</p>
              </div>
            ) : issues.map(issue => {
              const cfg = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.Medium;
              const isExpanded = expandedId === issue.id;
              const isDone = ['Resolved', 'Pending Verification', 'Closed'].includes(issue.status);

              return (
                <div key={issue.id} className={`task-card ${isDone ? 'task-done' : ''}`} style={{ '--priority-color': cfg.color }}>
                  <div className="task-priority-bar" style={{ background: cfg.color }} />
                  <div className="task-card-inner">
                    <div className="task-card-header" onClick={() => navigate(`/issues/${issue.id}`)}>
                      <div className="task-info">
                        <div className="task-priority-tag" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</div>
                        <h3 className="task-title">{issue.title}</h3>
                        <p className="task-meta">
                          <span>📍 {issue.address || issue.ward}</span>
                          <span>·</span>
                          <span>{issue.category}</span>
                          {issue.slaDeadline && <span>· SLA: {new Date(issue.slaDeadline).toLocaleDateString()}</span>}
                        </p>
                      </div>
                      <StatusBadge status={issue.status} />
                    </div>

                    {!isDone && (
                      <div className="task-actions">
                        <button
                          className="task-btn task-btn-progress"
                          disabled={issue.status === 'In Progress' || submitting[issue.id]}
                          onClick={() => handleStatusUpdate(issue, 'In Progress')}
                        >
                          🔄 Start Working
                        </button>
                        <button
                          className="task-btn task-btn-resolve"
                          disabled={submitting[issue.id]}
                          onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                        >
                          ✅ Submit Resolution
                        </button>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="task-resolve-panel">
                        <div className="resolve-upload">
                          <label className="upload-label">
                            <span className="upload-icon">📷</span>
                            <span>{resPhotos[issue.id] ? resPhotos[issue.id].name : 'Upload Resolution Photo (required)'}</span>
                            <input type="file" accept="image/*" hidden onChange={e => setResPhotos(p => ({ ...p, [issue.id]: e.target.files[0] }))} />
                          </label>
                          {resPhotos[issue.id] && (
                            <img src={URL.createObjectURL(resPhotos[issue.id])} alt="" className="res-thumb" />
                          )}
                        </div>
                        <textarea
                          className="input-field note-area"
                          rows={3}
                          placeholder="Add a resolution note (optional)..."
                          value={notes[issue.id] || ''}
                          onChange={e => setNotes(p => ({ ...p, [issue.id]: e.target.value }))}
                        />
                        <div className="resolve-submit-row">
                          <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setExpandedId(null)}>Cancel</button>
                          <button
                            className="btn-primary"
                            disabled={submitting[issue.id]}
                            onClick={() => handleStatusUpdate(issue, 'Resolved')}
                          >
                            {submitting[issue.id] ? <><span className="spinner" /> Submitting...</> : '✅ Submit as Resolved'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'map' && (
        <div className="fw-content">
          <div className="fw-map-header">
            <h1 className="fw-hero-title">Task Map</h1>
            <p className="fw-hero-sub">{issues.filter(i => i.latitude).length} tasks with location</p>
          </div>
          <div ref={mapRef} className="fw-map" />
        </div>
      )}

      {tab === 'profile' && (
        <div className="fw-content">
          <div className="fw-profile-card">
            <div className="fw-avatar">{user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
            <h2 className="fw-name">{user?.name}</h2>
            <p className="fw-email">{user?.email}</p>
            <p className="fw-ward-tag">{user?.ward || 'No ward assigned'}</p>
            <div className="fw-profile-stats">
              <div className="fw-profile-stat">
                <span className="fw-profile-stat-num">{done}</span>
                <span className="fw-profile-stat-lbl">Completed</span>
              </div>
              <div className="fw-profile-stat">
                <span className="fw-profile-stat-num">{active}</span>
                <span className="fw-profile-stat-lbl">Active</span>
              </div>
              <div className="fw-profile-stat">
                <span className="fw-profile-stat-num">{issues.length}</span>
                <span className="fw-profile-stat-lbl">Total</span>
              </div>
            </div>
            <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={async () => { await logout(); navigate('/'); }}>
              Logout
            </button>
          </div>
        </div>
      )}

      <nav className="fw-bottom-nav">
        {[
          { key: 'tasks', icon: '📋', label: 'Tasks' },
          { key: 'map',   icon: '🗺️', label: 'Map' },
          { key: 'profile', icon: '👤', label: 'Profile' },
        ].map(t => (
          <button key={t.key} className={`fw-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <span className="fw-tab-icon">{t.icon}</span>
            <span className="fw-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
