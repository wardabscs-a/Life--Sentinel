import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { fetchNearbyResources } from '../services/placesService';
import {
  Map, List, Phone, Navigation, Cross, Shield, Flame, Home, Truck,
  CloudRain, AlertTriangle, Loader2, RefreshCw, MapPin, ExternalLink,
  Search, Expand
} from 'lucide-react';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TYPE_COLORS = {
  hospital: '#ef4444',
  police: '#3b82f6',
  fire: '#f97316',
  shelter: '#8b5cf6',
  ambulance: '#22c55e',
};

const TYPE_ICONS = {
  hospital: Cross,
  police: Shield,
  fire: Flame,
  shelter: Home,
  ambulance: Truck,
};

const FILTERS = [
  { id: 'all', labelKey: 'common.all' },
  { id: 'hospital', labelKey: 'map.hospitals' },
  { id: 'police', labelKey: 'map.police' },
  { id: 'fire', labelKey: 'map.fire' },
  { id: 'shelter', labelKey: 'map.shelters' },
  { id: 'ambulance', labelKey: 'map.ambulance' },
];

function createCustomIcon(type) {
  const color = TYPE_COLORS[type] || '#6b7280';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;background:white;border-radius:50%;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function LocationMarker({ position }) {
  const { t } = useLanguage();
  return position ? (
    <Marker position={[position.lat, position.lng]} icon={L.divIcon({
      className: 'user-marker',
      html: `<div style="background:#0ea5e9;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(14,165,233,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })}>
      <Popup>{t('map.yourLocation')}</Popup>
    </Marker>
  ) : null;
}

function WeatherAlertCircle({ position, severity }) {
  const color = severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f97316' : '#eab308';
  return (
    <Circle
      center={position}
      radius={3000}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.1, weight: 2, dashArray: '5,10' }}
    />
  );
}

/** Recenter map when user location changes */
function MapFollower({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [position?.lat, position?.lng]);
  return null;
}

export default function EmergencyMap() {
  const { t } = useLanguage();
  const { location, locationPermission, locationLoading, fetchLocation, currentWeather, weatherAlerts } = useSafety();
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('map');

  // Real nearby resources state
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState(null);
  const [expandedSearch, setExpandedSearch] = useState(false);

  // Fetch real nearby resources when location changes
  useEffect(() => {
    if (!location || locationLoading) return;

    let cancelled = false;
    setResourcesLoading(true);
    setResourcesError(null);

    fetchNearbyResources(location.lat, location.lng)
      .then(({ resources: fetched, expanded }) => {
        if (cancelled) return;
        setResources(fetched);
        setExpandedSearch(expanded);
        setResourcesLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Nearby resources fetch failed:', err);
        setResourcesError(err.message || t('map.fetchError'));
        setResourcesLoading(false);
      });

    return () => { cancelled = true; };
  }, [location?.lat, location?.lng, locationLoading]);

  const center = location ? [location.lat, location.lng] : [33.6844, 73.0479];

  // Filter resources by active filter (applied client-side for instant filtering)
  const filteredResources = useMemo(() => {
    if (activeFilter === 'all') return resources;
    return resources.filter(r => r.type === activeFilter);
  }, [resources, activeFilter]);

  const handleRetry = useCallback(() => {
    if (location) {
      setResourcesLoading(true);
      setResourcesError(null);
      fetchNearbyResources(location.lat, location.lng)
        .then(({ resources: fetched, expanded }) => {
          setResources(fetched);
          setExpandedSearch(expanded);
          setResourcesLoading(false);
        })
        .catch(err => {
          setResourcesError(err.message || t('map.fetchError'));
          setResourcesLoading(false);
        });
    } else {
      fetchLocation();
    }
  }, [location, fetchLocation]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
            <Map className="w-7 h-7 text-sentinel-500" />
            {t('map.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('resources.subtitle')}</p>
          {location && !locationLoading && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin className="w-3 h-3" />
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              {location.accuracy ? ` (±${Math.round(location.accuracy)}m)` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRetry}
            disabled={resourcesLoading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            title={t('map.refreshResources')}
          >
            <RefreshCw className={`w-4 h-4 ${resourcesLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'map' ? 'bg-sentinel-500 text-white' : ''
            }`}
            style={viewMode !== 'map' ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
          >
            <Map className="w-4 h-4" /> {t('map.showMap')}
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'list' ? 'bg-sentinel-500 text-white' : ''
            }`}
            style={viewMode !== 'list' ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
          >
            <List className="w-4 h-4" /> {t('map.showList')}
          </button>
        </div>
      </div>

      {/* Weather Alert Banner */}
      {weatherAlerts && weatherAlerts.length > 0 && (
        <div className="card p-3 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning-700 dark:text-warning-400">
                {weatherAlerts.length} {t('map.activeWeatherAlerts')}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {weatherAlerts[0].title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weather Info */}
      {currentWeather && (
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <CloudRain className="w-4 h-4" />
          <span>{currentWeather.temperature}°C — {currentWeather.description} — {t('map.wind')} {currentWeather.windspeed} km/h — {t('map.humidity')} {currentWeather.humidity}%</span>
        </div>
      )}

      {/* Expanded search indicator */}
      {expandedSearch && !resourcesLoading && (
        <div className="card p-3 flex items-center gap-2" style={{ background: 'var(--color-bg-secondary)' }}>
          <Expand className="w-4 h-4 text-warning-500 flex-shrink-0" />
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('map.expandedSearch')}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === f.id ? 'bg-sentinel-500 text-white' : ''
            }`}
            style={activeFilter !== f.id ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {/* Location loading state */}
      {locationLoading && (
        <div className="card text-center p-8">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-sentinel-500 mb-3" />
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t('map.gettingLocation')}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('map.allowLocation')}</p>
        </div>
      )}

      {/* Location permission denied */}
      {!locationLoading && locationPermission === 'denied' && (
        <div className="card text-center p-8">
          <MapPin className="w-10 h-10 mx-auto text-warning-500 mb-3" />
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>{t('map.locationRequired')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {t('map.locationRequiredDesc')}
          </p>
          <button onClick={fetchLocation} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('map.enableLocation')}
          </button>
        </div>
      )}

      {/* Resources fetch error */}
      {!locationLoading && locationPermission !== 'denied' && resourcesError && (
        <div className="card text-center p-6">
          <AlertTriangle className="w-8 h-8 mx-auto text-warning-500 mb-3" />
          <h2 className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>{t('map.unableFetch')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{resourcesError}</p>
          <button onClick={handleRetry} className="btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Map */}
      {!locationLoading && locationPermission !== 'denied' && viewMode === 'map' && (
        <div className="card p-0 overflow-hidden" style={{ height: '450px' }}>
          <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={location} />
            <MapFollower position={location} />
            {filteredResources.map(resource => (
              <Marker key={resource.id} position={[resource.lat, resource.lng]} icon={createCustomIcon(resource.type)}>
                <Popup>
                  <div className="p-1" style={{ minWidth: '160px' }}>
                    <p className="font-bold text-sm">{resource.name}</p>
                    <p className="text-xs text-gray-600 capitalize">{resource.type}</p>
                    {resource.address && <p className="text-xs text-gray-500 mt-1">{resource.address}</p>}
                    <p className="text-xs font-semibold text-gray-700 mt-1">{resource.distance} {t('common.away')}</p>
                    {resource.phone && (
                      <a href={`tel:${resource.phone}`} className="text-xs text-blue-600 font-semibold mt-1 block">
                        {t('common.call')}: {resource.phone}
                      </a>
                    )}
                    {location && (
                      <a
                        href={`https://www.google.com/maps/dir/${resource.lat},${resource.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 font-semibold mt-1 block"
                      >
                        {t('map.openGoogleMaps')} →
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
            {/* Weather alert zones */}
            {weatherAlerts && location && weatherAlerts.map((alert, i) => (
              <WeatherAlertCircle
                key={`alert-${i}`}
                position={[location.lat, location.lng]}
                severity={alert.severity}
              />
            ))}
          </MapContainer>
        </div>
      )}

      {/* Resource List */}
      {!locationLoading && locationPermission !== 'denied' && !resourcesError && (
        <>
          {resourcesLoading ? (
            <div className="card text-center p-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-sentinel-500 mb-3" />
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t('map.searching')}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('map.searchingDesc')}
              </p>
            </div>
          ) : (
            <>
              {filteredResources.length > 0 && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  <Search className="w-3.5 h-3.5" />
                  {filteredResources.length} {t('map.resourcesFound')}
                  {expandedSearch && <span className="ml-1 text-warning-500 font-medium">{t('map.expandedLabel')}</span>}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredResources.map(resource => {
                  const TypeIcon = TYPE_ICONS[resource.type] || Map;
                  const color = TYPE_COLORS[resource.type] || '#6b7280';
                  return (
                    <div key={resource.id} className="card flex items-start gap-3 p-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}15` }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{resource.name}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>{resource.type}</p>
                        {resource.address && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{resource.address}</p>
                        )}
                        <p className="text-xs font-semibold mt-1" style={{ color }}>
                          {resource.distance}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {resource.phone && (
                            <a href={`tel:${resource.phone}`} className="flex items-center gap-1 text-xs font-semibold text-sentinel-600 hover:underline">
                              <Phone className="w-3 h-3" /> {t('common.call')}
                            </a>
                          )}
                          <a
                            href={`https://www.google.com/maps/dir/${resource.lat},${resource.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold text-sentinel-600 hover:underline"
                          >
                            <Navigation className="w-3 h-3" /> {t('common.navigate')}
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredResources.length === 0 && (
                <div className="card text-center p-8">
                  <Search className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)' }} />
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                    {t('map.noFilterResults')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {activeFilter !== 'all'
                      ? t('map.tryAll')
                      : t('map.tryConnection')
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Data source credit */}
      {!locationLoading && !resourcesError && filteredResources.length > 0 && (
        <p className="text-[11px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {t('map.dataFooter')}
        </p>
      )}
    </div>
  );
}
