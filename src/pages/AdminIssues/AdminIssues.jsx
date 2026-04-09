import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import api from '../../services/api';
import { toast } from 'react-toastify';
import './AdminIssues.css';

export default function AdminIssues() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    ward: '',
    from: '',
    to: '',
    assigned: ''
  });

  const [selected, setSelected] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [bulkWorker, setBulkWorker] = useState('');

  // Load workers
  useEffect(() => {
    api.get('/admin/fieldworkers')
      .then(r => setWorkers(r.data.workers || []));
  }, []);

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v)
        )
      });

      const res = await api.get(`/admin/issues?${params}`);

      setIssues(res.data.issues || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  // ✅ Fixed useEffect
  useEffect(() => {
    fetchIssues();
  }, [page, filters]);

  const handleBulkAction = async (action) => {
    if (!selected.length) return;

    try {
      await api.patch('/admin/issues/bulk', {
        ids: selected,
        action,
        assignedToId: bulkWorker || undefined
      });

      toast.success('Bulk action applied');
      setSelected([]);
      fetchIssues();
    } catch {
      toast.error('Bulk action failed');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/issues/${id}/status`, { status });
      setIssues(p =>
        p.map(i => i.id === id ? { ...i, status } : i)
      );
    } catch {
      toast.error('Status update failed');
    }
  };

  const handleAssign = async (id, workerId) => {
    try {
      await api.post('/admin/assign', { issueId: id, workerId });

      setIssues(p =>
        p.map(i =>
          i.id === id ? { ...i, assignedToId: workerId } : i
        )
      );

      toast.success('Assigned');
    } catch {
      toast.error('Assignment failed');
    }
  };

  const toggleSelect = (id) =>
    setSelected(p =>
      p.includes(id) ? p.filter(x => x !== id) : [...p, id]
    );

  const toggleAll = () =>
    setSelected(
      selected.length === issues.length ? [] : issues.map(i => i.id)
    );

  return (
    <div className="admin-root">
      <Navbar />

      <div style={{ display: 'flex', flex: 1 }}>
        <aside className="admin-sidebar">
          <div className="sidebar-logo">CivicPulse</div>

          <NavLink to="/admin" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            📊 Dashboard
          </NavLink>

          <NavLink to="/admin/issues" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            📋 All Issues
          </NavLink>
        </aside>

        <div className="admin-issues-page">

          <h1>All Issues</h1>

          {loading ? (
            <p>Loading...</p>
          ) : issues.length === 0 ? (
            <p>No issues found</p>
          ) : (
            issues.map(issue => (
              <div
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #eee' }}
              >
                <strong>{issue.title}</strong> <br />
                Status: {issue.status}
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}