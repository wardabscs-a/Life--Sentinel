import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { getCommunityIncidents } from '../services/emergencyService';
import { Route, AlertTriangle, MapPin, Info, Navigation, ExternalLink, RefreshCw } from 'lucide-react';

export default function SafeRoutes() {
  const { t } = useLanguage();
  const { location, locationPermission, fetchLocation } = useSafety();

  const [destination, setDestination] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState(null);

  // Load community-reported incidents for display alongside navigation
  useEffect(() => {
    let cancelled = false;
    setIncidentsLoading(true);
    setIncidentsError(null);

    getCommunityIncidents(location, t)
      .then(data => {
        if (!cancelled) setIncidents(data);
      })
      .catch(err => {
        if (!cancelled) setIncidentsError(err.message || t('common.error', 'Error'));
      })
      .finally(() => {
        if (!cancelled) setIncidentsLoading(false);
      });

    return () => { cancelled = true; };
  }, [location, t]);

  const hasLocation = location && locationPermission === 'granted';

  const handleNavigate = useCallback(() => {
    const trimmed = destination.trim();
    if (!trimmed) return;

    const encodedDestination = encodeURIComponent(trimmed);
    let url;

    if (hasLocation) {
      const origin = `${location.lat},${location.lng}`;
      url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodedDestination}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }, [destination, hasLocation, location]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <Route className="w-7 h-7 text-sentinel-500" />
          {t('routes.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {t('routes.subtitle')}
        </p>
      </div>

      {/* Current Location */}
      <div className="card space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <MapPin className="w-5 h-5 text-sentinel-500" />
          {t('routes.currentLocation', 'Current Location')}
        </h2>

        {hasLocation ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {location.address && location.address !== `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                ? location.address
                : `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
              {location.accuracy ? ` (±${Math.round(location.accuracy)}m)` : ''}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('routes.locationActive', 'Location active')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {locationPermission === 'denied'
                ? t('routes.locationNeededDesc')
                : t('routes.locationUnavailable', 'Location unavailable')}
            </p>
            <button
              onClick={fetchLocation}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sentinel-600 hover:underline"
            >
              <RefreshCw className="w-4 h-4" />
              {t('common.retry', 'Retry')}
            </button>
          </div>
        )}
      </div>

      {/* Navigation disclaimer */}
      <div className="card p-4 flex items-start gap-3" style={{ background: 'var(--color-bg-secondary)' }}>
        <Info className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('routes.googleMapsDisclaimer', 'Navigation is provided by Google Maps. Life Sentinel does not currently provide real-time traffic information.')}
        </p>
      </div>

      {/* Destination + Navigate */}
      <div className="card space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Navigation className="w-5 h-5 text-sentinel-500" />
          {t('routes.destination', 'Destination')}
        </h2>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('routes.destinationPlaceholder', 'Where do you want to go?')}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-sentinel-500"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <button
            onClick={handleNavigate}
            disabled={!destination.trim()}
            className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <ExternalLink className="w-4 h-4" />
            {t('routes.navigate', 'Navigate')}
          </button>
        </div>

        {!hasLocation && (
          <div className="p-3 rounded-lg flex items-start gap-2 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800">
            <AlertTriangle className="w-4 h-4 text-warning-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              {t('routes.locationNeeded', 'Location access needed')}
            </p>
          </div>
        )}
      </div>

      {/* Community Hazards */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2 text-emergency-600">
          <AlertTriangle className="w-5 h-5" />
          {t('routes.communityReports', 'Community Reports')}
        </h2>

        {incidentsLoading ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('common.loading', 'Loading...')}</p>
        ) : incidentsError ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{incidentsError}</p>
        ) : incidents.length === 0 ? (
          <div className="card text-center p-6">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('routes.noCommunityReports', 'No community-reported hazards available at this time.')}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('routes.communityHazardsLabel', 'Community-reported hazards (not from live traffic data)')}
            </p>
            <div className="space-y-3">
              {incidents.map(incident => (
                <div key={incident.id} className="card border-l-4 border-emergency-500 bg-emergency-50 dark:bg-emergency-900/10">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emergency-100 dark:bg-emergency-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-emergency-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{incident.title}</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{incident.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="badge badge-critical">{t('routes.hazardous', 'Hazard')}</span>
                        {incident.status && (
                          <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                            {incident.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Safety Tips */}
      <div className="card">
        <h3 className="font-bold mb-3" style={{ color: 'var(--color-text)' }}>{t('routes.generalTips')}</h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <li className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-sentinel-500 mt-0.5 flex-shrink-0" />
            {t('routes.tip1')}
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-sentinel-500 mt-0.5 flex-shrink-0" />
            {t('routes.tip2')}
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-sentinel-500 mt-0.5 flex-shrink-0" />
            {t('routes.tip3')}
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-sentinel-500 mt-0.5 flex-shrink-0" />
            {t('routes.tip4')}
          </li>
        </ul>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {t('routes.googleMapsDisclaimer', 'Navigation is provided by Google Maps. Life Sentinel does not currently provide real-time traffic information.')}
      </p>
    </div>
  );
}
