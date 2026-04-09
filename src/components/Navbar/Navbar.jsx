import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useRef();
  const userRef = useRef();

  useEffect(() => {
    if (!user) return;
    api.get('/users/notifications').then(r => setNotifications(r.data.notifications || []));
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifOpen = () => {
    setShowNotif(v => !v);
    setShowUser(false);
    if (!showNotif && notifications.some(n => !n.read)) {
      api.patch('/users/notifications/read-all').then(() =>
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const unread = notifications.filter(n => !n.read).length;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const navLinks = user?.role === 'admin'
    ? [{ to: '/admin', label: 'Dashboard' }, { to: '/admin/issues', label: 'Issues' }, { to: '/map', label: 'Map' }]
    : user?.role === 'fieldworker'
    ? [{ to: '/fieldworker', label: 'My Tasks' }, { to: '/map', label: 'Map' }]
    : [{ to: '/', label: 'Home' }, { to: '/dashboard', label: 'Dashboard' }, { to: '/map', label: 'Map' }, { to: '/report', label: 'Report' }];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-logo">
          <span className="logo-dot" />
          CivicPulse
        </NavLink>

        <button className="hamburger" onClick={() => setMenuOpen(v => !v)}>
          <span /><span /><span />
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(l => (
            <NavLink key={l.to} to={l.to} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="navbar-right">
          {user ? (
            <>
              <div className="notif-wrap" ref={notifRef}>
                <button className="notif-btn" onClick={handleNotifOpen}>
                  🔔
                  {unread > 0 && <span className="notif-badge">{unread}</span>}
                </button>
                {showNotif && (
                  <div className="notif-dropdown">
                    <p className="notif-header">Notifications</p>
                    {notifications.length === 0 && <p className="notif-empty">No notifications</p>}
                    {notifications.slice(0, 8).map(n => (
                      <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                        <p>{n.message}</p>
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="user-wrap" ref={userRef}>
                <button className="avatar-btn" onClick={() => { setShowUser(v => !v); setShowNotif(false); }}>
                  {initials}
                </button>
                {showUser && (
                  <div className="user-dropdown">
                    <p className="user-name">{user.name}</p>
                    <p className="user-role">{user.role}</p>
                    <hr />
                    <button onClick={() => { navigate('/profile'); setShowUser(false); }}>Profile</button>
                    <button onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <NavLink to="/login" className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
