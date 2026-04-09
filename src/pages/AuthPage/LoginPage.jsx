import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const ROLES = [
  { key: 'citizen', label: 'Citizen', icon: '👤', desc: 'Report and track civic issues' },
  { key: 'admin', label: 'Admin', icon: '🛡️', desc: 'Manage and assign issues' },
  { key: 'fieldworker', label: 'Field Worker', icon: '🔧', desc: 'View and resolve assigned tasks' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      const user = await login(form.email, form.password);
      // Validate role matches selected tab
      if (user.role !== selectedRole) {
        setErrors({ general: `This account is not a ${selectedRole} account. Please select the correct role.` });
        setLoading(false);
        return;
      }
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'fieldworker') navigate('/fieldworker');
      else navigate('/dashboard');
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  const activeRole = ROLES.find(r => r.key === selectedRole);

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo"><span className="logo-dot" />CivicPulse</div>
          <p className="auth-tagline">Empowering citizens to build better cities.</p>
          <ul className="auth-features">
            <li>✓ Report civic issues instantly</li>
            <li>✓ Track resolution in real-time</li>
            <li>✓ Verify fixes before closing</li>
          </ul>
          <div className="auth-role-info">
            <p className="auth-role-info-title">Signing in as</p>
            <div className="auth-role-info-card">
              <span className="auth-role-info-icon">{activeRole.icon}</span>
              <div>
                <p className="auth-role-info-name">{activeRole.label}</p>
                <p className="auth-role-info-desc">{activeRole.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Select your role and sign in</p>

          {/* Role tabs */}
          <div className="role-tabs">
            {ROLES.map(role => (
              <button
                key={role.key}
                className={`role-tab ${selectedRole === role.key ? 'active' : ''}`}
                onClick={() => { setSelectedRole(role.key); setErrors({}); }}
                type="button"
              >
                <span className="role-tab-icon">{role.icon}</span>
                <span className="role-tab-label">{role.label}</span>
              </button>
            ))}
          </div>

          {errors.general && <div className="auth-error-banner">{errors.general}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email address</label>
              <input
                className={`input-field ${errors.email ? 'input-error' : ''}`}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="pass-wrap">
                <input
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading
                ? <><span className="spinner" /> Signing in...</>
                : `Sign in as ${activeRole.label}`
              }
            </button>
          </form>

          {selectedRole === 'citizen' && (
            <p className="auth-switch">Don't have an account? <Link to="/register">Register</Link></p>
          )}
          {selectedRole !== 'citizen' && (
            <p className="auth-switch" style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
              {selectedRole === 'admin' ? 'Admin accounts are created by system administrators.' : 'Field worker accounts are created by admins.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
