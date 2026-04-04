import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './shiftmap.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createMarkerIcon = (color) => {
  return L.divIcon({
    html: `
      <div style="color: ${color}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); display: flex; align-items: center; justify-content: center;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5">
          <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="9.5" r="3" fill="white" />
        </svg>
      </div>
    `,
    className: 'custom-marker-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
};

const createPingIcon = () => {
    return L.divIcon({
      html: `
        <div style="background-color: #fbbf24; border-radius: 50%; width: 10px; height: 10px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>
      `,
      className: 'custom-ping-icon',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
};

const MapResizer = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [bounds, map]);
  return null;
};

const ShiftMapModal = ({ isOpen, onClose, selectedTrail, employees }) => {
  const [mapType, setMapType] = useState('standard');
  
  if (!isOpen || !selectedTrail) return null;

  const { points, empId, date } = selectedTrail;
  if (!points || !Array.isArray(points) || points.length === 0) return null;

  const employee = employees.find(e => (e.EmpID || e.employee_code) === empId);
  const path = points.map(p => [parseFloat(p.lat), parseFloat(p.lng)]).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
  
  if (path.length === 0) return null;

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  const formatDateLabel = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return isNaN(d) ? dateString : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTimeLabel = (timeString) => {
    if (!timeString) return "-";
    const d = new Date(timeString);
    return isNaN(d) ? timeString : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="track-modal-overlay" onClick={onClose}>
      <div className="track-modal-container animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="track-header">
          <button className="back-arrow" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <h2>My track</h2>
        </div>

        <div className="track-content">
            {/* Legend Shelf */}
            <div className="track-legend">
                <div className="legend-item"><span className="legend-icon purple"></span> Branch Location</div>
                <div className="legend-item"><span className="legend-icon orange"></span> Start</div>
                <div className="legend-item"><span className="legend-icon blue"></span> End</div>
            </div>

            {/* Filter Pills */}
            <div className="track-filters">
                <div className="filter-pill">
                    <span>{formatDateLabel(date)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                <div className="filter-pill">
                    <span>First Shift</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            </div>

            {/* Interactive Map Area */}
            <div className="map-portal">
                <div className="map-view-modes">
                    <button className={mapType === 'standard' ? 'active' : ''} onClick={() => setMapType('standard')}>Map</button>
                    <button className={mapType === 'satellite' ? 'active' : ''} onClick={() => setMapType('satellite')}>Satellite</button>
                </div>

                <MapContainer 
                    center={path[0]} 
                    zoom={15} 
                    zoomControl={false}
                    className="leaflet-viewport"
                >
                    {mapType === 'standard' ? (
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    ) : (
                    <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    )}

                    <MapResizer bounds={path} />
                    <ZoomControl position="bottomright" />

                    {/* Movement Path */}
                    <Polyline 
                        positions={path} 
                        color="#2563eb" 
                        weight={5} 
                        opacity={0.8}
                        lineCap="round"
                    />

                    {/* Intermediate Points */}
                    {points.slice(1, -1).map((p, i) => (
                        <Marker key={i} position={[p.lat, p.lng]} icon={createPingIcon()}>
                            <Popup minWidth={90}>
                                <div className="ping-tooltip">
                                    <span className="tooltip-time">{formatTimeLabel(p.time)}</span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Start Marker */}
                    <Marker position={[startPoint.lat, startPoint.lng]} icon={createMarkerIcon('#f97316')}>
                        <Popup>
                            <div className="ping-tooltip">
                                <strong className="tooltip-tag start">SHIFT START</strong>
                                <span className="tooltip-time">{formatTimeLabel(startPoint.time)}</span>
                            </div>
                        </Popup>
                    </Marker>

                    {/* End Marker */}
                    <Marker position={[endPoint.lat, endPoint.lng]} icon={createMarkerIcon('#2563eb')}>
                        <Popup>
                            <div className="ping-tooltip">
                                <strong className="tooltip-tag end">LAST PING</strong>
                                <span className="tooltip-time">{formatTimeLabel(endPoint.time)}</span>
                            </div>
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>

            {/* Bottom Info Strip */}
            <div className="tracking-footer">
                <div className="track-profile">
                    <div className="profile-img">{employee?.Name?.charAt(0)}</div>
                    <div className="profile-text">
                        <h3>{employee?.Name}</h3>
                        <p>{employee?.Designation} • ID: {empId}</p>
                    </div>
                </div>
                <div className="track-meta">
                    <div className="meta-block">
                        <label>Capture Pings</label>
                        <span>{points.length} coordinates</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftMapModal;
