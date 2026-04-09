import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar/Navbar';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { toast } from 'react-toastify';
import './IssueDetail.css';

const STATUS_ORDER = ['Open', 'Assigned', 'In Progress', 'Pending Verification', 'Resolved', 'Closed'];

export default function IssueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/issues/${id}`), api.get(`/issues/${id}/comments`)])
      .then(([ir, cr]) => { setIssue(ir.data.issue); setComments(cr.data.comments || []); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join:issue', id);
    socket.on('issue:updated', ({ issue: updated }) => setIssue(updated));
    socket.on('comment:new', ({ comment }) => setComments(prev => [...prev, comment]));
    socket.on('issue:pending_verification', ({ issue: updated }) => {
      setIssue(updated);
      toast.info('Please verify if your issue has been resolved properly.');
    });
    return () => {
      socket.off('issue:updated');
      socket.off('comment:new');
      socket.off('issue:pending_verification');
    };
  }, [socket, id]);

  const handleVote = async () => {
    try {
      const res = await api.post(`/issues/${id}/vote`);
      setIssue(p => ({ ...p, voteCount: res.data.voteCount }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not vote');
    }
  };

  const handleVerify = async (approved) => {
    setVerifying(true);
    try {
      const res = await api.post(`/issues/${id}/verify`, { approved, feedback: verifyFeedback });
      setIssue(res.data.issue);
      toast.success(approved ? '✅ Issue marked as properly resolved!' : '🔄 Issue reopened for further work.');
      setVerifyFeedback('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await api.post(`/issues/${id}/comments`, { text: commentText });
      setCommentText('');
    } catch { toast.error('Could not post comment'); }
    finally { setPosting(false); }
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!issue) return <div className="page-loading">Issue not found</div>;

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const isReporter = user?.id === issue.reporterId;
  const isPendingVerification = issue.status === 'Pending Verification';
  const isReopened = issue.status === 'Reopened';

  // Build dynamic timeline including Reopened if applicable
  const timelineStatuses = isReopened
    ? [...STATUS_ORDER, 'Reopened']
    : STATUS_ORDER;
  const currentStatusIdx = timelineStatuses.indexOf(issue.status);

  return (
    <div className="detail-page">
      <Navbar />
      <div className="detail-inner">
        <div className="detail-main">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link to="/">Home</Link> › <Link to="/dashboard">Issues</Link> › {issue.category}
          </div>

          {/* Header */}
          <div className="detail-header">
            <div className="detail-badges">
              <StatusBadge status={issue.category} />
              <StatusBadge status={issue.priority} />
              <StatusBadge status={issue.status} />
            </div>
            <h1 className="detail-title">{issue.title}</h1>
            <div className="detail-meta">
              <div className="reporter-avatar">{initials(issue.reporter?.name)}</div>
              <span>{issue.reporter?.name}</span>
              <span>·</span>
              <span>{issue.ward}</span>
              <span>·</span>
              <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* ── CITIZEN VERIFICATION PANEL ── */}
          {isPendingVerification && isReporter && (
            <div className="verify-panel">
              <div className="verify-panel-header">
                <span className="verify-icon">🔍</span>
                <div>
                  <h3 className="verify-title">Verify Resolution</h3>
                  <p className="verify-subtitle">The field worker has marked this issue as resolved. Please check and confirm.</p>
                </div>
              </div>

              {issue.resolutionNote && (
                <div className="verify-resolution-note">
                  <strong>Worker's note:</strong> {issue.resolutionNote}
                </div>
              )}

              {issue.resolutionPhotos?.length > 0 && (
                <div className="verify-photos">
                  <p className="verify-photos-label">Resolution photos submitted by worker:</p>
                  <div className="verify-photos-grid">
                    {issue.resolutionPhotos.map((p, i) => (
                      <img key={i} src={p.startsWith('/uploads') ? `http://localhost:5000${p}` : p} alt="" className="verify-photo" />
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Your feedback (optional)</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Describe what you observed at the site..."
                  value={verifyFeedback}
                  onChange={e => setVerifyFeedback(e.target.value)}
                />
              </div>

              <div className="verify-actions">
                <button
                  className="verify-btn-approve"
                  onClick={() => handleVerify(true)}
                  disabled={verifying}
                >
                  {verifying ? <span className="spinner" /> : '✅'} Yes, Issue is Fixed
                </button>
                <button
                  className="verify-btn-reject"
                  onClick={() => handleVerify(false)}
                  disabled={verifying}
                >
                  {verifying ? <span className="spinner" /> : '❌'} No, Not Fixed Properly
                </button>
              </div>
            </div>
          )}

          {/* Verification result banner */}
          {issue.citizenVerified === true && (
            <div className="verify-result approved">
              <span>✅</span>
              <div>
                <strong>Citizen Verified — Issue Properly Resolved</strong>
                {issue.citizenFeedback && <p>{issue.citizenFeedback}</p>}
                <span className="verify-result-time">{new Date(issue.citizenVerifiedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
          {issue.citizenVerified === false && (
            <div className="verify-result rejected">
              <span>❌</span>
              <div>
                <strong>Citizen Reported — Issue Not Properly Fixed</strong>
                {issue.citizenFeedback && <p>{issue.citizenFeedback}</p>}
                <span className="verify-result-time">{new Date(issue.citizenVerifiedAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Pending verification notice for non-reporters */}
          {isPendingVerification && !isReporter && (
            <div className="verify-notice">
              ⏳ Awaiting citizen verification. The reporter has been notified to confirm the fix.
            </div>
          )}

          {/* Photos */}
          {(issue.photos?.length > 0 || issue.resolutionPhotos?.length > 0) && (
            <div className="photos-section">
              {issue.photos?.length > 0 && (
                <div className="photos-col">
                  <p className="section-title">Complaint Photos</p>
                  <div className="photos-grid">
                    {issue.photos.map((p, i) => (
                      <img key={i} src={p.startsWith('/uploads') ? `http://localhost:5000${p}` : p} alt="" className="issue-photo" />
                    ))}
                  </div>
                </div>
              )}
              {issue.resolutionPhotos?.length > 0 && (
                <div className="photos-col">
                  <p className="section-title">Resolution Photos</p>
                  <div className="photos-grid">
                    {issue.resolutionPhotos.map((p, i) => (
                      <img key={i} src={p.startsWith('/uploads') ? `http://localhost:5000${p}` : p} alt="" className="issue-photo" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status timeline */}
          <div className="timeline-section">
            <p className="section-title">Status Timeline</p>
            <div className="timeline">
              {timelineStatuses.map((s, i) => {
                const histEntry = issue.StatusHistories?.find(h => h.toStatus === s);
                const isDone = i < currentStatusIdx;
                const isCurrent = i === currentStatusIdx;
                return (
                  <div key={s} className="timeline-item">
                    <div className={`timeline-dot ${isDone ? 'done' : isCurrent ? 'current' : 'pending'}`} />
                    {i < timelineStatuses.length - 1 && <div className={`timeline-connector ${isDone ? 'done' : ''}`} />}
                    <div className="timeline-content">
                      <span className={`timeline-status ${isCurrent ? 'current' : isDone ? 'done' : 'pending'}`}>{s}</span>
                      {histEntry && <span className="timeline-time">{new Date(histEntry.createdAt).toLocaleString()}</span>}
                      {histEntry?.note && <p className="timeline-note">{histEntry.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="detail-desc-section">
            <p className="section-title">Description</p>
            <p className="detail-desc">{issue.description}</p>
            {issue.resolutionNote && (
              <div className="resolution-note">
                <strong>Resolution Note:</strong> {issue.resolutionNote}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="comments-section">
            <p className="section-title">Comments ({comments.length})</p>
            <div className="comments-list">
              {comments.map(c => (
                <div key={c.id} className="comment-item">
                  <div className="comment-avatar">{initials(c.User?.name)}</div>
                  <div className="comment-body">
                    <div className="comment-header">
                      <span className="comment-name">{c.User?.name}</span>
                      <span className="comment-time">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {user && (
              <form onSubmit={handleComment} className="comment-form">
                <textarea className="input-field" rows={3} placeholder="Add a comment..."
                  value={commentText} onChange={e => setCommentText(e.target.value)} />
                <button type="submit" className="btn-primary" disabled={posting}>
                  {posting ? <><span className="spinner" /> Posting...</> : 'Post Comment'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="detail-sidebar">
          <div className="sidebar-card">
            <button className="upvote-btn" onClick={handleVote}>
              <span className="upvote-icon">▲</span>
              <span className="upvote-count">{issue.voteCount || 0}</span>
            </button>
            <p className="upvote-label">Community support</p>
          </div>

          {issue.assignedTo && (
            <div className="sidebar-card">
              <p className="sidebar-card-title">Assigned To</p>
              <div className="assigned-worker">
                <div className="worker-avatar">{initials(issue.assignedTo.name)}</div>
                <div>
                  <p className="worker-name">{issue.assignedTo.name}</p>
                  <p className="worker-dept">{issue.department}</p>
                </div>
              </div>
            </div>
          )}

          {/* Verification status in sidebar */}
          {(issue.citizenVerified !== null && issue.citizenVerified !== undefined) && (
            <div className="sidebar-card">
              <p className="sidebar-card-title">Citizen Verdict</p>
              <div className={`sidebar-verdict ${issue.citizenVerified ? 'approved' : 'rejected'}`}>
                {issue.citizenVerified ? '✅ Approved' : '❌ Rejected'}
              </div>
            </div>
          )}

          <div className="sidebar-card">
            <p className="sidebar-card-title">Share</p>
            <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={copyLink}>
              🔗 Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
