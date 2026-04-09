import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Navbar from '../../components/Navbar/Navbar';
import { toast } from 'react-toastify';
import './ReportIssue.css';

const CATEGORIES = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Drainage', 'Construction', 'Other'];
const CATEGORY_ICONS = { Roads: '🛣️', Water: '💧', Electricity: '⚡', Sanitation: '🗑️', Parks: '🌳', Drainage: '🌊', Construction: '🏗️', Other: '📋' };
const DEPT_MAP = { Roads: 'PWD Roads', Water: 'Water / TWAD', Electricity: 'TNEB', Sanitation: 'Corporation', Parks: 'Corporation', Drainage: 'Corporation', Construction: 'PWD Roads', Other: 'Corporation' };
const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10'];
const PRIORITIES = [
  { value: 'Low', color: 'var(--green)', light: 'var(--green-light)' },
  { value: 'Medium', color: 'var(--amber)', light: 'var(--amber-light)' },
  { value: 'High', color: 'var(--orange)', light: 'var(--orange-light)' },
  { value: 'Critical', color: 'var(--red)', light: 'var(--red-light)' },
];

export default function ReportIssue() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ category: '', title: '', description: '', ward: '', department: '', priority: 'Medium', photos: [], latitude: null, longitude: null, address: '' });
  const [duplicate, setDuplicate] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const mapRef = useRef();
  const mapInstance = useRef();

  const checkDuplicate = async (title) => {
    if (!title || title.length < 5) return;
    try {
      const res = await api.get(`/issues/check-duplicate?q=${encodeURIComponent(title)}`);
      setDuplicate(res.data.match);
    } catch {}
  };

  const detectLocation = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setForm(p => ({ ...p, latitude, longitude }));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await res.json();
        setForm(p => ({ ...p, address: data.display_name || '' }));
      } catch {}
      setLocLoading(false);
      initMap(latitude, longitude);
    }, () => { setLocLoading(false); toast.error('Could not get location'); });
  };

  const initMap = (lat, lng) => {
    if (!mapRef.current) return;
    import('leaflet').then(L => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
      if (mapRef.current._leaflet_id) { delete mapRef.current._leaflet_id; }
      const map = L.map(mapRef.current).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', (e) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        setForm(p => ({ ...p, latitude: newLat, longitude: newLng }));
      });
      mapInstance.current = map;
    });
  };

  const handlePhotos = (files) => {
    const arr = Array.from(files).slice(0, 5 - form.photos.length);
    setForm(p => ({ ...p, photos: [...p.photos, ...arr].slice(0, 5) }));
  };

  const removePhoto = (i) => setForm(p => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }));

  const canNext = () => {
    if (step === 0) return !!form.category;
    if (step === 1) return form.title.length >= 3 && form.description.length >= 10 && form.ward;
    if (step === 2) return !!form.priority;
    if (step === 3) return true;
    if (step === 4) return true;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'photos') v.forEach(f => fd.append('photos', f));
        else if (v !== null && v !== undefined) fd.append(k, v);
      });
      await api.post('/issues', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Issue submitted successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ['Category', 'Details', 'Priority', 'Photos', 'Location', 'Review'];

  return (
    <div className="report-page">
      <Navbar />
      <div className="report-inner">
        {/* Step indicator */}
        <div className="step-indicator">
          {STEPS.map((s, i) => (
            <div key={i} className="step-ind-item">
              <div className={`step-ind-circle ${i < step ? 'done' : i === step ? 'current' : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`step-ind-label ${i === step ? 'active' : ''}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`step-ind-line ${i < step ? 'filled' : ''}`} />}
            </div>
          ))}
        </div>

        <div className="report-card">
          {/* Step 0: Category */}
          {step === 0 && (
            <div>
              <h2 className="report-step-title">Select a Category</h2>
              <div className="cat-grid-report">
                {CATEGORIES.map(cat => (
                  <div key={cat} className={`cat-tile ${form.category === cat ? 'selected' : ''}`}
                    onClick={() => setForm(p => ({ ...p, category: cat, department: DEPT_MAP[cat] }))}>
                    <span className="cat-tile-icon">{CATEGORY_ICONS[cat]}</span>
                    <span className="cat-tile-name">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="form-fields">
              <h2 className="report-step-title">Issue Details</h2>
              <div className="form-group">
                <label>Issue Title</label>
                <input className="input-field" placeholder="Brief title of the issue"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  onBlur={e => checkDuplicate(e.target.value)} />
              </div>
              {duplicate && (
                <div className="duplicate-warning">
                  <p>⚠ A similar issue exists: <strong>{duplicate.title}</strong></p>
                  <div className="dup-actions">
                    <Link to={`/issues/${duplicate.id}`} className="btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>View & Upvote</Link>
                    <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 16px' }} onClick={() => setDuplicate(null)}>Report Anyway</button>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Description</label>
                <textarea className="input-field" rows={4} placeholder="Describe the issue in detail..."
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ward</label>
                  <select className="input-field" value={form.ward} onChange={e => setForm(p => ({ ...p, ward: e.target.value }))}>
                    <option value="">Select ward</option>
                    {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input className="input-field" value={form.department} readOnly style={{ background: 'var(--surface2)' }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Priority */}
          {step === 2 && (
            <div>
              <h2 className="report-step-title">Set Priority</h2>
              <div className="priority-grid">
                {PRIORITIES.map(p => (
                  <button key={p.value}
                    className={`priority-btn ${form.priority === p.value ? 'selected' : ''}`}
                    style={form.priority === p.value ? { background: p.light, borderColor: p.color, color: p.color } : {}}
                    onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}>
                    {p.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <div>
              <h2 className="report-step-title">Upload Photos</h2>
              <div className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handlePhotos(e.dataTransfer.files); }}
                onClick={() => fileRef.current.click()}>
                <p>📷 Drop photos here or click to upload</p>
                <span>Max 5 photos · JPG, PNG, WebP</span>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handlePhotos(e.target.files)} />
              </div>
              {form.photos.length > 0 && (
                <div className="photo-previews">
                  {form.photos.map((f, i) => (
                    <div key={i} className="photo-thumb">
                      <img src={URL.createObjectURL(f)} alt="" />
                      <button className="photo-remove" onClick={() => removePhoto(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <div>
              <h2 className="report-step-title">Pin Location</h2>
              <button className="btn-primary" onClick={detectLocation} disabled={locLoading}>
                {locLoading ? <><span className="spinner" /> Detecting...</> : '📍 Detect My Location'}
              </button>
              {form.address && (
                <div className="location-confirmed">
                  <span>✓</span> {form.address}
                </div>
              )}
              <div ref={mapRef} className="report-map" />
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Manual Address</label>
                <input className="input-field" placeholder="Enter address manually"
                  value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <h2 className="report-step-title">Review & Submit</h2>
              <div className="review-card">
                <div className="review-row">
                  <span className="review-label">Category</span>
                  <span>{CATEGORY_ICONS[form.category]} {form.category}</span>
                  <button className="edit-link" onClick={() => setStep(0)}>Edit</button>
                </div>
                <div className="review-row">
                  <span className="review-label">Title</span>
                  <span>{form.title}</span>
                  <button className="edit-link" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="review-row">
                  <span className="review-label">Description</span>
                  <span className="review-desc">{form.description.slice(0, 100)}{form.description.length > 100 ? '...' : ''}</span>
                  <button className="edit-link" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="review-row">
                  <span className="review-label">Priority</span>
                  <span>{form.priority}</span>
                  <button className="edit-link" onClick={() => setStep(2)}>Edit</button>
                </div>
                <div className="review-row">
                  <span className="review-label">Ward</span>
                  <span>{form.ward}</span>
                  <button className="edit-link" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="review-row">
                  <span className="review-label">Photos</span>
                  <span>{form.photos.length} photo(s)</span>
                  <button className="edit-link" onClick={() => setStep(3)}>Edit</button>
                </div>
                <div className="review-row">
                  <span className="review-label">Location</span>
                  <span className="review-desc">{form.address || 'Not set'}</span>
                  <button className="edit-link" onClick={() => setStep(4)}>Edit</button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="report-nav">
            {step > 0 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>}
            {step < 5
              ? <button className="btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Next →</button>
              : <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Submitting...</> : 'Submit Report'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
