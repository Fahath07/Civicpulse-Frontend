import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import Navbar from '../../components/Navbar/Navbar';
import IssueCard from '../../components/IssueCard/IssueCard';
import SkeletonLoader from '../../components/SkeletonLoader/SkeletonLoader';
import { toast } from 'react-toastify';
import './CitizenDashboard.css';

const FILTERS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
const PAGE_SIZE = 5;

export default function CitizenDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activity, setActivity] = useState([]);
  const mapRef = useRef();
  const mapInstance = useRef();

  useEffect(() => {
    api.get('/issues/my').then(r => {
      setIssues(r.data.issues || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('issue:updated', ({ issue }) => {
      setIssues(prev => prev.map(i => i.id === issue.id ? issue : i));
      setActivity(prev => [{ id: Date.now(), msg: `"${issue.title}" → ${issue.status}`, time: new Date() }, ...prev.slice(0, 9)]);
    });
    socket.on('trust:updated', ({ trustScore, badge }) => {
      toast.info(`Trust score: ${trustScore} (${badge})`);
    });
    return () => { socket.off('issue:updated'); socket.off('trust:updated'); };
  }, [socket]);

  useEffect(() => {
    if (!mapRef.current) return;
    let map;
    import('leaflet').then(L => {
      if (mapRef.current._leaflet_id) return;
      import('leaflet/dist/leaflet.css');
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'), iconUrl: require('leaflet/dist/images/marker-icon.png'), shadowUrl: require('leaflet/dist/images/marker-shadow.png') });
      map = L.map(mapRef.current).setView([13.0827, 80.2707], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      mapInstance.current = map;
    });
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !issues.length) return;
    import('leaflet').then(L => {
      issues.filter(i => i.latitude && i.longitude).forEach(issue => {
        L.marker([issue.latitude, issue.longitude])
          .addTo(mapInstance.current)
          .bindPopup(`<b>${issue.title}</b><br/>${issue.status}`);
      });
    });
  }, [issues]);

  const handleVote = async (id) => {
    try {
      const res = await api.post(`/issues/${id}/vote`);
      setIssues(prev => prev.map(i => i.id === id ? { ...i, voteCount: res.data.voteCount } : i));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not vote');
    }
  };

  const filtered = issues.filter(i => {
    const matchFilter = filter === 'All' || i.status === filter;
    const matchSearch = !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  const stats = {
    total: issues.length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
    pending: issues.filter(i => ['Open', 'Assigned', 'In Progress'].includes(i.status)).length,
    inProgress: issues.filter(i => i.status === 'In Progress').length,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const trustScore = user?.trustScore || 0;
  const badge = user?.badge || 'Bronze';
  const nextThreshold = trustScore <= 30 ? 30 : trustScore <= 60 ? 60 : trustScore <= 90 ? 90 : 100;
  const progress = Math.min((trustScore / nextThreshold) * 100, 100);

  const BADGE_COLORS = { Bronze: '#CD7F32', Silver: '#A8A9AD', Gold: '#FFD700', Platinum: '#E5E4E2' };

  return (
    <div className="citizen-page">
      <Navbar />

      <div className="citizen-hero">
        <div className="citizen-hero-inner">
          <div className="citizen-hero-text">
            <p className="citizen-greeting-label">{greeting}</p>
            <h1 className="citizen-greeting">{user?.name?.split(' ')[0]}</h1>
            <p className="citizen-ward">
              <span className="ward-dot" />
              {user?.ward || 'Your Ward'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="citizen-hero-stats">
            {[
              { label: 'Total Reports', value: stats.total, color: 'var(--accent)', icon: '📋' },
              { label: 'Resolved', value: stats.resolved, color: 'var(--green)', icon: '✅' },
              { label: 'In Progress', value: stats.inProgress, color: 'var(--amber)', icon: '🔄' },
              { label: 'Trust Score', value: trustScore, color: 'var(--blue)', icon: '⭐' },
            ].map(s => (
              <div key={s.label} className="hero-stat-card">
                <span className="hero-stat-icon">{s.icon}</span>
                <span className="hero-stat-num" style={{ color: s.color }}>{s.value}</span>
                <span className="hero-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="citizen-body">
        <div className="citizen-main">
          <div className="issues-header">
            <div>
              <h2 className="section-head">My Reports</h2>
              <p className="section-sub">{filtered.length} issue{filtered.length !== 1 ? 's' : ''} found</p>
            </div>
            <Link to="/report" className="btn-primary">+ New Report</Link>
          </div>

          <div className="issues-controls">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by title or category..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {search && <button className="search-clear" onClick={() => handleSearch('')}>×</button>}
            </div>
            <div className="filter-chips">
              {FILTERS.map(f => (
                <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => handleFilterChange(f)}>
                  {f}
                  {f !== 'All' && <span className="chip-count">{issues.filter(i => i.status === f).length}</span>}
                </button>
              ))}
            </div>
          </div>

          {loading ? <SkeletonLoader count={3} /> : paginated.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-title">No issues found</p>
                <p className="empty-sub">{search || filter !== 'All' ? 'Try adjusting your filters.' : 'You haven\'t reported any issues yet.'}</p>
                {!search && filter === 'All' && <Link to="/report" className="btn-primary" style={{ marginTop: 16 }}>Report an Issue</Link>}
              </div>
            )
            : paginated.map(issue => <IssueCard key={issue.id} issue={issue} onVote={handleVote} />)
          }

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>

        <div className="citizen-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">Issue Map</h3>
            <div ref={mapRef} className="mini-map" />
          </div>

          <div className="sidebar-card trust-card">
            <div className="trust-header">
              <div>
                <h3 className="sidebar-card-title" style={{ marginBottom: 0 }}>Trust Score</h3>
                <p className="trust-score-num">{trustScore}</p>
              </div>
              <span className="trust-badge-pill" style={{ background: BADGE_COLORS[badge] + '22', color: BADGE_COLORS[badge], border: `1.5px solid ${BADGE_COLORS[badge]}44` }}>
                {badge}
              </span>
            </div>
            <div className="trust-bar-wrap">
              <div className="trust-bar" style={{ width: `${progress}%` }} />
            </div>
            <p className="trust-next">{nextThreshold - trustScore} pts to next rank</p>
          </div>

          <div className="sidebar-card">
            <h3 className="sidebar-card-title">Live Activity</h3>
            {activity.length === 0
              ? <p className="empty-text">No recent activity</p>
              : activity.map(a => (
                <div key={a.id} className="activity-item">
                  <span className="activity-dot" />
                  <div>
                    <p className="activity-msg">{a.msg}</p>
                    <span className="activity-time">{new Date(a.time).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
