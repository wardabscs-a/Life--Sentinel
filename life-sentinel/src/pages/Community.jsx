import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { MOCK_COMMUNITY_INCIDENTS, EMERGENCY_CATEGORIES } from '../data/mockData';
import { haversineDistance } from '../services/placesService';
import { Users, MapPin, Clock, AlertTriangle, CheckCircle, Activity, MessageCircle, Loader2 } from 'lucide-react';

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const CATEGORY_COLORS = {
  accident: '#f59e0b',
  fire: '#ef4444',
  flood: '#3b82f6',
  earthquake: '#8b5cf6',
  medical: '#ec4899',
  crime: '#f97316',
  other: '#6b7280',
};

export default function Community() {
  const { t } = useLanguage();
  const { location, locationPermission } = useSafety();
  const [filter, setFilter] = useState('active');
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Calculate distances from user's current location to each incident
  const incidentsWithDistance = useMemo(() => {
    const tr = (key, fallback) => { const r = t(key); return r !== key ? r : fallback; };
    const translated = MOCK_COMMUNITY_INCIDENTS.map(i => ({
      ...i,
      title: tr(`mock.incident.${i.id}.title`, i.title),
      description: tr(`mock.incident.${i.id}.desc`, i.description),
    }));
    if (!location) {
      return translated.map(i => ({ ...i, distance: null }));
    }
    return translated.map(incident => {
      const dist = haversineDistance(location.lat, location.lng, incident.lat, incident.lng);
      return { ...incident, distance: dist };
    }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [location, t]);

  // Filter by radius: 5km default, expand to 25km if few results
  const NEARBY_RADIUS = 5; // km
  const EXPANDED_RADIUS = 25; // km

  const nearbyIncidents = useMemo(() => {
    if (!location || locationPermission !== 'granted') return incidentsWithDistance; // show all if no location
    const withinRange = incidentsWithDistance.filter(i => i.distance !== null && i.distance <= NEARBY_RADIUS);
    if (withinRange.length >= 2) return withinRange;
    // Expand search radius
    return incidentsWithDistance.filter(i => i.distance !== null && i.distance <= EXPANDED_RADIUS);
  }, [incidentsWithDistance, location, locationPermission]);

  const searchExpanded = nearbyIncidents.length > 0 && nearbyIncidents.every(i => i.distance > NEARBY_RADIUS);

  // Apply status filter
  const filteredIncidents = nearbyIncidents.filter(i =>
    filter === 'all' ? true : i.status === filter
  );

  const activeCount = nearbyIncidents.filter(i => i.status === 'active').length;
  const resolvedCount = nearbyIncidents.filter(i => i.status === 'resolved').length;
  const totalReports = nearbyIncidents.reduce((sum, i) => sum + i.reportCount, 0);

  const center = location ? [location.lat, location.lng] : [33.6844, 73.0479];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <Users className="w-7 h-7 text-sentinel-500" />
          {t('community.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {location && locationPermission === 'granted'
            ? `${t('community.locationBased')} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
            : t('community.subtitle')}
        </p>
      </div>

      {/* Location permission notice */}
      {locationPermission === 'denied' && (
        <div className="card p-4 flex items-start gap-3 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800">
          <MapPin className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{t('community.locationNeeded')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('community.locationNeededDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Expanded search notice */}
      {searchExpanded && (
        <div className="card p-3 flex items-center gap-2" style={{ background: 'var(--color-bg-secondary)' }}>
          <MapPin className="w-4 h-4 text-sentinel-500" />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('community.expandedNotice').replace('{radius}', EXPANDED_RADIUS)}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center p-3">
          <p className="text-2xl font-bold text-emergency-600">{activeCount}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('community.active')}</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-2xl font-bold text-safe-600">{resolvedCount}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('community.resolved')}</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-2xl font-bold text-sentinel-600">{totalReports}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('community.totalReports')}</p>
        </div>
      </div>

      {/* Map */}
      <div className="card p-0 overflow-hidden" style={{ height: '350px' }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* User location marker */}
          {location && locationPermission === 'granted' && (
            <CircleMarker
              center={[location.lat, location.lng]}
              radius={8}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.7, weight: 3 }}
            >
              <Popup><strong>{t('community.yourLocation')}</strong></Popup>
            </CircleMarker>
          )}
          {filteredIncidents.map(incident => (
            <CircleMarker
              key={incident.id}
              center={[incident.lat, incident.lng]}
              radius={Math.min(8 + incident.reportCount * 2, 20)}
              pathOptions={{
                color: SEVERITY_COLORS[incident.severity],
                fillColor: SEVERITY_COLORS[incident.severity],
                fillOpacity: 0.4,
                weight: 2,
              }}
              eventHandlers={{ click: () => setSelectedIncident(incident) }}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <p className="font-bold text-sm">{incident.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{incident.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className={`badge ${incident.severity === 'high' || incident.severity === 'critical' ? 'badge-critical' : incident.severity === 'medium' ? 'badge-warning' : 'badge-safe'}`}>
                      {incident.severity}
                    </span>
                    <span className="text-gray-500">{incident.reportCount} {t('community.reportCount')}</span>
                    {incident.distance != null && (
                      <span className="text-gray-500">{incident.distance < 1 ? `${Math.round(incident.distance * 1000)} m` : `${incident.distance.toFixed(1)} km`}</span>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'resolved'].map(f => {
          const fLabel = f === 'all' ? t('common.all')
            : f === 'active' ? t('community.active')
            : t('community.resolved');
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-sentinel-500 text-white' : ''
              }`}
              style={filter !== f ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
            >
              {fLabel}
            </button>
          );
        })}
      </div>

      {/* No nearby incidents message */}
      {filteredIncidents.length === 0 && location && locationPermission === 'granted' && (
        <div className="card text-center p-8">
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('community.noIncidentsNearby')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('community.noIncidentsDesc').replace('{radius}', EXPANDED_RADIUS)}
          </p>
        </div>
      )}

      {/* Incident Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIncidents.map(incident => (
          <div
            key={incident.id}
            className={`card cursor-pointer hover:shadow-lg transition-all ${
              selectedIncident?.id === incident.id ? 'ring-2 ring-sentinel-500' : ''
            }`}
            onClick={() => setSelectedIncident(incident)}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${CATEGORY_COLORS[incident.category] || '#6b7280'}15` }}
              >
                <Activity className="w-5 h-5" style={{ color: CATEGORY_COLORS[incident.category] || '#6b7280' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`badge ${
                    incident.severity === 'critical' || incident.severity === 'high' ? 'badge-critical' :
                    incident.severity === 'medium' ? 'badge-warning' : 'badge-safe'
                  }`}>{incident.severity}</span>
                  <span className={`badge ${incident.status === 'active' ? 'badge-critical' : 'badge-safe'}`}>
                    {incident.status === 'active' ? t('community.active') : t('community.resolved')}
                  </span>
                  {incident.distance != null && (
                    <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                      <MapPin className="w-3 h-3 mr-1" />
                      {incident.distance < 1 ? `${Math.round(incident.distance * 1000)} m` : `${incident.distance.toFixed(1)} km`}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 truncate" style={{ color: 'var(--color-text)' }}>{incident.title}</h3>
                <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--color-text-secondary)' }}>{incident.description}</p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {incident.reportCount} {t('community.reportCount')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(incident.timestamp).toLocaleDateString()}
                  </span>
                  <span className="capitalize">{incident.category}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!filteredIncidents.length && !location && (
        <div className="card text-center p-8">
          <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('community.noIncidents')}</p>
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
        <span className="badge badge-info mr-1">{t('common.demoData')}</span>
        {t('community.footer')}
      </p>
    </div>
  );
}
