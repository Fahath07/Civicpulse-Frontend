import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import Navbar from '../../components/Navbar/Navbar';
import './MapView.css';

const CATEGORIES = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Parks', 'Drainage', 'Construction', 'Other'];
const STATUSES = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10'];

const STATUS_COLORS = { Open: '#C85A20', 'In Progress': '#1A3A5C', Resolved: '#1A5828', Assigned: '#3A1A5C', Closed: '#8A8480', Critical: '#8A1818' };

export default function MapView() {
  const [issues, setIssues] = useState([]);
  const [filters, setFilters] = useState({ search: '', categories: [], statuses: [], priorities: [], ward: '' });
  const mapRef = useRef();
  const mapInstance = useRef();
  const markersRef = useRef([]);
  const debounceRef = useRef();

  useEffect(() => {
    api.get('/issues/public').then(r => setIssues(r.data.issues || []));
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapRef.current._leaflet_id) return;
    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'), iconUrl: require('leaflet/dist/images/marker-icon.png'), shadowUrl: require('leaflet/dist/images/marker-shadow.png') });
      const map = L.map(mapRef.current).setView([13.0827, 80.2707], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      mapInstance.current = map;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 13);
        });
      }
    });
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  const updateMarkers = useCallback(() => {
    if (!mapInstance.current) return;
    import('leaflet').then(L => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      const filtered = issues.filter(issue => {
        if (filters.search && !issue.title?.toLowerCase().includes(filters.search.toLowerCase()) && !issue.address?.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.categories.length && !filters.categories.includes(issue.category)) return false;
        if (filters.statuses.length && !filters.statuses.includes(issue.status)) return false;
        if (filters.priorities.length && !filters.priorities.includes(issue.priority)) return false;
        if (filters.ward && issue.ward !== filters.ward) return false;
        return issue.latitude && issue.longitude;
      });
      filtered.forEach(issue => {
        const color = STATUS_COLORS[issue.priority === 'Critical' ? 'Critical' : issue.status] || '#8A8480';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([issue.latitude, issue.longitude], { icon })
          .addTo(mapInstance.current)
          .bindPopup(`<b>${issue.title}</b><br/><span style="font-size:12px">${issue.status} · ${issue.voteCount || 0} votes</span><br/><a href="/issues/${issue.id}" style="color:#0F2D1F;font-size:12px">View Details →</a>`);
        markersRef.current.push(marker);
      });
    });
  }, [issues, filters]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateMarkers(), 400);
    return () => clearTimeout(debounceRef.current);
  }, [updateMarkers]);

  const toggleFilter = (key, value) => {
    setFilters(p => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter(v => v !== value) : [...p[key], value],
    }));
  };

  const clearFilters = () => setFilters({ search: '', categories: [], statuses: [], priorities: [], ward: '' });

  return (
    <div className="map-page">
      <Navbar />
      <div className="map-container">
        <div ref={mapRef} className="leaflet-map" />
        <div className="filter-panel">
          <div className="filter-panel-header">
            <h3>Filters</h3>
            <button className="btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={clearFilters}>Clear</button>
          </div>
          <input className="input-field" placeholder="Search issues..." value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} style={{ marginBottom: 16 }} />

          <div className="filter-group">
            <p className="filter-group-label">Category</p>
            {CATEGORIES.map(c => (
              <label key={c} className="filter-check">
                <input type="checkbox" checked={filters.categories.includes(c)} onChange={() => toggleFilter('categories', c)} />
                {c}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <p className="filter-group-label">Status</p>
            {STATUSES.map(s => (
              <label key={s} className="filter-check">
                <input type="checkbox" checked={filters.statuses.includes(s)} onChange={() => toggleFilter('statuses', s)} />
                {s}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <p className="filter-group-label">Priority</p>
            {PRIORITIES.map(p => (
              <label key={p} className="filter-check">
                <input type="checkbox" checked={filters.priorities.includes(p)} onChange={() => toggleFilter('priorities', p)} />
                {p}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <p className="filter-group-label">Ward</p>
            <select className="input-field" value={filters.ward} onChange={e => setFilters(p => ({ ...p, ward: e.target.value }))}>
              <option value="">All wards</option>
              {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
