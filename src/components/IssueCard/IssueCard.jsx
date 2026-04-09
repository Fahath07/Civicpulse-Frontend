import { useNavigate } from 'react-router-dom';
import StatusBadge from '../StatusBadge/StatusBadge';
import './IssueCard.css';

const CATEGORY_ICONS = {
  Roads: '🛣️', Water: '💧', Electricity: '⚡', Sanitation: '🗑️',
  Parks: '🌳', Drainage: '🌊', Construction: '🏗️', Other: '📋',
};

const PRIORITY_BAR = { Low: { w: '25%', color: 'var(--green)' }, Medium: { w: '50%', color: 'var(--amber)' }, High: { w: '75%', color: 'var(--orange)' }, Critical: { w: '100%', color: 'var(--red)' } };

export default function IssueCard({ issue, onVote }) {
  const navigate = useNavigate();
  const slaWarning = issue.slaDeadline && !['Resolved','Closed'].includes(issue.status) &&
    (new Date(issue.slaDeadline) - new Date()) < 2 * 86400000 &&
    (new Date(issue.slaDeadline) - new Date()) > 0;
  const slaBreached = issue.slaDeadline && !['Resolved','Closed'].includes(issue.status) &&
    new Date(issue.slaDeadline) < new Date();
  const bar = PRIORITY_BAR[issue.priority] || PRIORITY_BAR.Medium;

  return (
    <div className="issue-card" onClick={() => navigate(`/issues/${issue.id}`)}>
      <div className="issue-card-accent" style={{ background: bar.color }} />
      <div className="issue-card-icon">
        {CATEGORY_ICONS[issue.category] || '📋'}
      </div>
      <div className="issue-card-body">
        <div className="issue-card-top">
          <h3 className="issue-card-title">{issue.title}</h3>
          <div className="issue-card-badges">
            <StatusBadge status={issue.status} />
            <StatusBadge status={issue.priority} />
          </div>
        </div>
        <div className="issue-card-meta">
          <span className="meta-chip">{issue.category}</span>
          {issue.ward && <span className="meta-chip">📍 {issue.ward}</span>}
          <span className="meta-chip">🕐 {new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          {issue.assignedTo && <span className="meta-chip">👷 {issue.assignedTo.name}</span>}
        </div>
        <div className="issue-card-footer">
          <div className="priority-bar-wrap">
            <div className="priority-bar-fill" style={{ width: bar.w, background: bar.color }} />
          </div>
          {(slaWarning || slaBreached) && (
            <span className={`sla-tag ${slaBreached ? 'breached' : 'warning'}`}>
              {slaBreached ? '🔴 SLA Breached' : '⚠ SLA Soon'}
            </span>
          )}
          {onVote && (
            <button className="vote-pill" onClick={e => { e.stopPropagation(); onVote(issue.id); }}>
              ▲ {issue.voteCount || 0}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
