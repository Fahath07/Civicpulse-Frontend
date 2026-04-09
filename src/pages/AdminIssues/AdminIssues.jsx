import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import api from '../../services/api';
import './AdminIssues.css';

export default function AdminIssues() {
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await api.get('/admin/issues');
        setIssues(res.data.issues || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

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
                style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
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