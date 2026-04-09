import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10'];

export default function RegisterPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '', ward: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateStep0 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    return e;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.ward) e.ward = 'Please select your ward';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleNext = () => {
    const errs = validateStep0();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: form.name, email: form.email, phone: form.phone,
        ward: form.ward, password: form.password,
      });
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo"><span className="logo-dot" />CivicPulse</div>
          <p className="auth-tagline">Join thousands of citizens making their city better.</p>
          <ul className="auth-features">
            <li>✓ Free to join, always</li>
            <li>✓ Report issues in under 2 minutes</li>
            <li>✓ Get notified when issues are resolved</li>
          </ul>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <div className="step-progress">
            <div className={`step-seg ${step >= 0 ? 'active' : ''}`} />
            <div className={`step-seg ${step >= 1 ? 'active' : ''}`} />
          </div>
          <h1 className="auth-title">{step === 0 ? 'Create account' : 'Almost done'}</h1>
          <p className="auth-subtitle">Step {step + 1} of 2</p>
          {errors.general && <div className="auth-error-banner">{errors.general}</div>}

          {step === 0 ? (
            <div className="auth-form">
              <div className="form-group">
                <label>Full name</label>
                <input className={`input-field ${errors.name ? 'input-error' : ''}`} placeholder="John Doe"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label>Email address</label>
                <input className={`input-field ${errors.email ? 'input-error' : ''}`} type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>Phone number <span className="optional">(optional)</span></label>
                <input className="input-field" placeholder="+91 98765 43210"
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <button type="button" className="btn-primary auth-submit" onClick={handleNext}>Continue →</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Ward / Area</label>
                <select className={`input-field ${errors.ward ? 'input-error' : ''}`}
                  value={form.ward} onChange={e => setForm(p => ({ ...p, ward: e.target.value }))}>
                  <option value="">Select your ward</option>
                  {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                {errors.ward && <span className="field-error">{errors.ward}</span>}
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className={`input-field ${errors.password ? 'input-error' : ''}`} type="password" placeholder="Min. 8 characters"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label>Confirm password</label>
                <input className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`} type="password" placeholder="Repeat password"
                  value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
              <div className="form-group">
                <label>Role</label>
                <div className="role-locked">Citizen <span className="lock-icon">🔒</span></div>
              </div>
              <div className="auth-step-btns">
                <button type="button" className="btn-ghost" onClick={() => setStep(0)}>← Back</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner" /> Creating...</> : 'Create Account'}
                </button>
              </div>
            </form>
          )}
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
