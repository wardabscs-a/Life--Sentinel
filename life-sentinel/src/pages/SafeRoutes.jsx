import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { MOCK_ROUTES } from '../data/mockData';
import { haversineDistance } from '../services/placesService';
import { Route, AlertTriangle, CheckCircle, MapPin, Info, Navigation } from 'lucide-react';

export default function SafeRoutes() {
  const { t } = useLanguage();
  const { location, locationPermission } = useSafety();

  // Calculate distance from user's current location to each route's midpoint
  const routesWithDistance = useMemo(() => {
    const tr = (key, fallback) => { const r = t(key); return r !== key ? r : fallback; };
    const translated = MOCK_ROUTES.map(r => ({
      ...r,
      reason: tr(`mock.route.${r.id}.reason`, r.reason),
    }));
    if (!location) {
      return translated.map(r => ({ ...r, distance: null, midpoint: r.coordinates?.[0] || [0, 0] }));
    }

    return translated.map(route => {
      // Use the first coordinate of the route as reference point
      const coords = route.coordinates?.[0] || [33.6844, 73.0479];
      const dist = haversineDistance(location.lat, location.lng, coords[0], coords[1]);
      return { ...route, distance: dist, midpoint: coords };
    }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [location, t]);

  // Filter routes: show nearby first (5km), expand to 20km if few results
  const nearbyThreshold = 5; // km
  const expandedThreshold = 20; // km

  const nearbyRoutes = useMemo(() => {
    const withinRange = routesWithDistance.filter(r =>
      r.distance !== null && r.distance <= nearbyThreshold
    );
    if (withinRange.length >= 2) return withinRange;
    // Expand search radius
    return routesWithDistance.filter(r =>
      r.distance !== null && r.distance <= expandedThreshold
    );
  }, [routesWithDistance]);

  const searchExpanded = nearbyRoutes.every(r => r.distance > nearbyThreshold) && nearbyRoutes.length > 0;

  const hazardousRoutes = nearbyRoutes.filter(r => r.status === 'hazardous');
  const safeRoutes = nearbyRoutes.filter(r => r.status === 'safe');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <Route className="w-7 h-7 text-sentinel-500" />
          {t('routes.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {location && locationPermission === 'granted'
            ? `${t('routes.locationBased')} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
            : t('routes.subtitle')}
        </p>
      </div>

      {/* Location permission notice */}
      {locationPermission === 'denied' && (
        <div className="card p-4 flex items-start gap-3 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800">
          <MapPin className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{t('routes.locationNeeded')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('routes.locationNeededDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Limitation Notice */}
      <div className="card p-4 flex items-start gap-3" style={{ background: 'var(--color-bg-secondary)' }}>
        <Info className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('routes.limitationNotice')}
        </p>
      </div>

      {/* Expanded search notice */}
      {searchExpanded && (
        <div className="card p-3 flex items-center gap-2" style={{ background: 'var(--color-bg-secondary)' }}>
          <Navigation className="w-4 h-4 text-sentinel-500" />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('routes.expandedNotice').replace('{radius}', expandedThreshold)}
          </p>
        </div>
      )}

      {/* No nearby routes message */}
      {nearbyRoutes.length === 0 && location && locationPermission === 'granted' && (
        <div className="card text-center p-8">
          <Route className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('routes.noRoutesNearby')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('routes.noRoutesDesc').replace('{radius}', expandedThreshold)}
          </p>
        </div>
      )}

      {/* Hazardous Routes */}
      {hazardousRoutes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-emergency-600">
            <AlertTriangle className="w-5 h-5" />
            {t('routes.hazardous')}
          </h2>
          <div className="space-y-3">
            {hazardousRoutes.map(route => (
              <div key={route.id} className="card border-l-4 border-emergency-500 bg-emergency-50 dark:bg-emergency-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emergency-100 dark:bg-emergency-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-emergency-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{route.name}</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{route.reason}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="badge badge-critical">{t('routes.hazardous')}</span>
                      {route.distance != null && (
                        <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                          <MapPin className="w-3 h-3 mr-1" />{route.distance < 1 ? `${Math.round(route.distance * 1000)} m` : `${route.distance.toFixed(1)} km`} {t('common.away')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safe Routes */}
      {safeRoutes.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-safe-600">
            <CheckCircle className="w-5 h-5" />
            {t('routes.safe')}
          </h2>
          <div className="space-y-3">
            {safeRoutes.map(route => (
              <div key={route.id} className="card border-l-4 border-safe-500 bg-safe-50 dark:bg-safe-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-safe-100 dark:bg-safe-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-safe-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{route.name}</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{route.reason}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="badge badge-safe">{t('routes.safe')}</span>
                      {route.distance != null && (
                        <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                          <MapPin className="w-3 h-3 mr-1" />{route.distance < 1 ? `${Math.round(route.distance * 1000)} m` : `${route.distance.toFixed(1)} km`} {t('common.away')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Advice */}
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
        <span className="badge badge-info mr-1">{t('common.demoData')}</span>
        {t('routes.footer')}
      </p>
    </div>
  );
}
