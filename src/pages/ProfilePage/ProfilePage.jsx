import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar/Navbar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { toast } from 'react-toastify';
import './ProfilePage.css';

const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10'];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('info');
  const [stats, setStats] = useState({});
  const [recentIssues, setRecentIssues] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', ward: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notifPref, setNotifPref] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users/profile').then(r => {
      setStats(r.data.stats || {});
      setProfileForm({ name: r.data.user.name || '', phone: r.data.user.phone || '', ward: r.data.user.ward || '' });
      setNotifPref(r.data.user.notifInApp !== false);
    });
    api.get('/issues/my').then(r => setRecentIssues((r.data.issues || []).slice(0, 10)));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/users/profile', profileForm);
      setUser(res.data.user);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passForm.newPassword.length < 8) { toast.error('Minimum 8 characters'); return; }
    setSaving(true);
    try {
      await api.put('/users/password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password updated');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const saveNotifPrefs = async () => {
    try {
      await api.put('/users/notifications/prefs', { notifInApp: notifPref });
      toast.success('Preferences saved');
    } catch { toast.error('Save failed'); }
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const trustScore = user?.trustScore || 0;
  const badge = user?.badge || 'Bronze';
  const nextThreshold = trustScore <= 30 ? 30 : trustScore <= 60 ? 60 : trustScore <= 90 ? 90 : 100;
  const progress = Math.min((trustScore / nextThreshold) * 100, 100);

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-inner">
        {/* Left panel */}
        <div className="profile-left">
          <div className="profile-avatar-card">
            <div className="profile-avatar">{initials}</div>
            <h2 className="profile-name">{user?.name}</h2>
            <span className="profile-role-badge">{user?.role}</span>
            <p className="profile-ward">{user?.ward}</p>
          </div>

          <div className="profile-stats-card">
            {[
              { label: 'Total Reports', value: stats.total || 0 },
              { label: 'Resolved', value: stats.resolved || 0 },
              { label: 'Pending', value: stats.pending || 0 },
            ].map(s => (
              <div key={s.label} className="profile-stat">
                <span className="profile-stat-num">{s.value}</span>
                <span className="profile-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="trust-card">
            <p className="trust-card-label">Trust Score</p>
            <div className="trust-score-big">{trustScore}</div>
            <span className={`trust-badge badge-${badge.toLowerCase()}`}>{badge}</span>
            <div className="trust-bar-wrap" style={{ marginTop: 12 }}>
              <div className="trust-bar" style={{ width: `${progress}%` }} />
            </div>
            <p className="trust-next">{nextThreshold - trustScore} pts to next rank</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="profile-right">
          <div className="profile-tabs">
            {['info', 'password', 'notifications'].map(t => (
              <button key={t} className={`profile-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'info' ? 'Personal Info' : t === 'password' ? 'Password' : 'Notifications'}
              </button>
            ))}
          </div>

          <div className="profile-tab-content">
            {tab === 'info' && (
              <div className="form-fields">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="input-field" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email <span className="read-only-tag">read-only</span></label>
                  <input className="input-field" value={user?.email || ''} readOnly style={{ background: 'var(--surface2)' }} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input className="input-field" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Ward</label>
                  <select className="input-field" value={profileForm.ward} onChange={e => setProfileForm(p => ({ ...p, ward: e.target.value }))}>
                    <option value="">Select ward</option>
                    {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            )}

            {tab === 'password' && (
              <div className="form-fields">
                <div className="form-group">
                  <label>Current Password</label>
                  <input className="input-field" type="password" value={passForm.currentPassword} onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input className="input-field" type="password" placeholder="Min. 8 characters" value={passForm.newPassword} onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input className="input-field" type="password" value={passForm.confirmPassword} onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                </div>
                <button className="btn-primary" onClick={savePassword} disabled={saving}>
                  {saving ? <><span className="spinner" /> Updating...</> : 'Update Password'}
                </button>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="form-fields">
                <div className="notif-pref-row">
                  <div>
                    <p className="notif-pref-label">In-App Notifications</p>
                    <p className="notif-pref-desc">Receive notifications inside the app</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={notifPref} onChange={e => setNotifPref(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <button className="btn-primary" onClick={saveNotifPrefs}>Save Preferences</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent reports table */}
      <div className="recent-reports">
        <div className="section-title">Recent Reports</div>
        <div className="table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {recentIssues.map(issue => (
                <tr key={issue.id}>
                  <td>{issue.title}</td>
                  <td><StatusBadge status={issue.status} /></td>
                  <td>{new Date(issue.createdAt).toLocaleDateString()}</td>
                  <td><button className="btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => navigate(`/issues/${issue.id}`)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
