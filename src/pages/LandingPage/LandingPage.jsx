import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import './LandingPage.css';

const CATEGORY_ICONS = {
  Roads: '🛣️', Water: '💧', Electricity: '⚡', Sanitation: '🗑️',
  Parks: '🌳', Drainage: '🌊', Construction: '🏗️', Other: '📋',
};

function useCounter(target, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export default function LandingPage() {
  const [stats, setStats] = useState({});
  const [issues, setIssues] = useState([]);
  const [catCounts, setCatCounts] = useState({});
  const statsBarRef = useRef();
  const [statsVisible, setStatsVisible] = useState(false);
  const navigate = useNavigate();

  const totalCount = useCounter(statsVisible ? (stats.total || 0) : 0);
  const resolvedCount = useCounter(statsVisible ? (stats.resolved || 0) : 0);
  const wardsCount = useCounter(statsVisible ? (stats.activeWards || 0) : 0);
  const avgCount = useCounter(statsVisible ? (stats.avgDays || 0) : 0);

  useEffect(() => {
    api.get('/issues/public').then(r => setIssues(r.data.issues || []));
    api.get('/admin/stats').then(r => {
      setStats(r.data);
      const counts = {};
      (r.data.byCategory || []).forEach(c => { counts[c.category] = parseInt(c.count); });
      setCatCounts(counts);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.3 });
    if (statsBarRef.current) obs.observe(statsBarRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-logo">
            <span className="logo-dot" />
            CivicPulse
          </Link>
          <div className="landing-nav-links">
            <a href="#how">How it works</a>
            <a href="#categories">Categories</a>
            <Link to="/map">Live Map</Link>
          </div>
          <div className="landing-nav-actions">
            <Link to="/login" className="btn-ghost" style={{ fontSize: 13, padding: '8px 20px', minHeight: 36 }}>Login</Link>
            <Link to="/report" className="btn-primary" style={{ fontSize: 13, padding: '8px 20px', minHeight: 36 }}>Report Issue</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-grid" />
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              Urban Issue Reporting Platform
            </div>
            <h1 className="hero-heading">
              Your city.<br />
              Your voice.<br />
              <span className="hero-heading-accent">Your fix.</span>
            </h1>
            <p className="hero-sub">
              Report urban issues, track resolution progress, and hold your city accountable — all in one place.
            </p>
            <div className="hero-btns">
              <Link to="/report" className="btn-primary hero-btn-main">
                <span>📍</span> Report an Issue
              </Link>
              <Link to="/map" className="btn-ghost">
                View Live Map →
              </Link>
            </div>
            <div className="hero-trust">
              <div className="hero-trust-avatars">
                {['C', 'A', 'F', 'B'].map((l, i) => (
                  <div key={i} className="trust-avatar" style={{ zIndex: 4 - i }}>{l}</div>
                ))}
              </div>
              <p>Trusted by <strong>citizens, admins & field workers</strong></p>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-card">
              <div className="hero-card-header">
                <span className="hero-card-live"><span className="live-dot" />Live City Stats</span>
              </div>
              <div className="hero-stats-grid">
                {[
                  { label: 'Total Issues', value: stats.total || 0, icon: '📋', color: 'var(--accent)' },
                  { label: 'Resolved', value: stats.resolved || 0, icon: '✅', color: 'var(--green)' },
                  { label: 'Active Wards', value: stats.activeWards || 0, icon: '🏘️', color: 'var(--blue)' },
                  { label: 'Avg Days', value: stats.avgDays || 0, icon: '⏱️', color: 'var(--amber)' },
                ].map(s => (
                  <div key={s.label} className="hero-stat">
                    <span className="hero-stat-icon">{s.icon}</span>
                    <span className="hero-stat-num" style={{ color: s.color }}>{s.value}</span>
                    <span className="hero-stat-lbl">{s.label}</span>
                  </div>
                ))}
              </div>
              {issues.slice(0, 2).map(issue => (
                <div key={issue.id} className="hero-issue-preview">
                  <span className="hero-issue-cat">{CATEGORY_ICONS[issue.category]}</span>
                  <div className="hero-issue-info">
                    <p className="hero-issue-title">{issue.title}</p>
                    <p className="hero-issue-ward">{issue.ward}</p>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="stats-bar" ref={statsBarRef}>
        {[
          { label: 'Total Issues', value: totalCount, icon: '📋' },
          { label: 'Resolved', value: resolvedCount, icon: '✅' },
          { label: 'Active Wards', value: wardsCount, icon: '🏘️' },
          { label: 'Avg Resolution Days', value: avgCount, icon: '⏱️' },
        ].map(s => (
          <div key={s.label} className="stats-bar-item">
            <span className="stats-bar-icon">{s.icon}</span>
            <span className="stats-bar-num">{s.value}</span>
            <span className="stats-bar-lbl">{s.label}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <section className="how-section" id="how">
        <div className="how-inner">
          <div className="section-label">How it works</div>
          <h2 className="section-heading">Simple. Fast. Accountable.</h2>
          <div className="steps-row">
            {[
              { n: '01', icon: '📸', title: 'Report an Issue', desc: 'Snap a photo, pin the location, and describe the problem in seconds.' },
              { n: '02', icon: '🔄', title: 'Track Progress', desc: 'Get real-time updates as your issue moves through the resolution pipeline.' },
              { n: '03', icon: '✅', title: 'Issue Resolved', desc: 'Field workers fix the problem and upload before/after proof.' },
            ].map((step, i) => (
              <div key={i} className="step-item">
                <div className="step-num">{step.n}</div>
                <div className="step-icon-wrap">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="cat-section" id="categories">
        <div className="cat-inner">
          <div className="section-label">Browse by Category</div>
          <h2 className="section-heading">What can you report?</h2>
          <div className="cat-grid">
            {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
              <div key={cat} className="cat-card" onClick={() => navigate('/map')}>
                <span className="cat-icon">{icon}</span>
                <span className="cat-name">{cat}</span>
                <span className="cat-count">{catCounts[cat] || 0} issues</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent issues */}
      <section className="recent-section">
        <div className="recent-inner">
          <div className="section-label">Community Feed</div>
          <div className="recent-header">
            <h2 className="section-heading" style={{ marginBottom: 0 }}>Recent Issues</h2>
            <Link to="/map" className="btn-ghost" style={{ fontSize: 13, padding: '8px 20px', minHeight: 36 }}>View All →</Link>
          </div>
          <div className="recent-grid">
            {issues.slice(0, 6).map((issue, i) => (
              <div key={issue.id} className="recent-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="recent-card-top">
                  <span className="recent-cat">{CATEGORY_ICONS[issue.category]} {issue.category}</span>
                  <StatusBadge status={issue.status} />
                </div>
                <h3 className="recent-title">{issue.title}</h3>
                <p className="recent-ward">📍 {issue.ward || 'Unknown ward'}</p>
                <div className="recent-footer">
                  <div className="recent-votes">
                    <span className="vote-icon">▲</span>
                    <span>{issue.voteCount || 0} votes</span>
                  </div>
                  <Link to={`/issues/${issue.id}`} className="recent-view-btn">View →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-heading">Ready to make your city better?</h2>
          <p className="cta-sub">Join thousands of citizens reporting and tracking urban issues in real time.</p>
          <div className="cta-btns">
            <Link to="/register" className="btn-primary cta-btn">Get Started Free</Link>
            <Link to="/map" className="btn-ghost cta-btn-ghost">Explore the Map</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="landing-logo" style={{ color: '#fff' }}>
              <span className="logo-dot" />CivicPulse
            </span>
            <p className="footer-tagline">Making cities more accountable, one report at a time.</p>
          </div>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/map">Live Map</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/report">Report Issue</Link>
          </div>
          <p className="footer-copy">© 2026 CivicPulse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
