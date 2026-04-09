import './StatusBadge.css';

const STATUS_CONFIG = {
  'Open':                 { cls: 'badge-blue',   dot: true },
  'Assigned':             { cls: 'badge-purple',  dot: true },
  'In Progress':          { cls: 'badge-amber',   dot: true, pulse: true },
  'Pending Verification': { cls: 'badge-orange',  dot: true },
  'Resolved':             { cls: 'badge-green',   dot: true },
  'Closed':               { cls: 'badge-gray',    dot: false },
  'Reopened':             { cls: 'badge-red',     dot: true },
  'Low':                  { cls: 'badge-green',   dot: false },
  'Medium':               { cls: 'badge-amber',   dot: false },
  'High':                 { cls: 'badge-orange',  dot: false },
  'Critical':             { cls: 'badge-red',     dot: false },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { cls: 'badge-gray', dot: false };
  return (
    <span className={`status-badge ${cfg.cls}`}>
      {cfg.dot && <span className={`badge-dot ${cfg.pulse ? 'pulse' : ''}`} />}
      {status}
    </span>
  );
}
