import React from 'react';
import { MapPin, Navigation, AlertTriangle, Users, Map, Bell, PhoneCall, RefreshCw, Shield } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSafety } from '../../contexts/SafetyContext';

const FEATURES = [
  { key: 'locationGate.featureResources', icon: PhoneCall },
  { key: 'locationGate.featureRoutes', icon: Navigation },
  { key: 'locationGate.featureCommunity', icon: Users },
  { key: 'locationGate.featureMap', icon: Map },
  { key: 'locationGate.featureAlerts', icon: Bell },
  { key: 'locationGate.featureEmergency', icon: AlertTriangle },
];

export default function LocationGate({ children }) {
  const { t } = useLanguage();
  const { location, locationPermission, locationLoading, fetchLocation } = useSafety();

  const tr = (key, fallback) => {
    const value = t(key);
    return value !== key ? value : fallback;
  };

  // Location granted and available — render the app content
  if (location && locationPermission === 'granted' && !locationLoading) {
    return children;
  }

  // Geolocation API unsupported or position unavailable
  if (locationPermission === 'unavailable' && !locationLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
        <div className="w-full max-w-md card p-6 sm:p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-warning-100 dark:bg-warning-900/20 flex items-center justify-center mx-auto mb-5">
            <MapPin className="w-8 h-8 text-warning-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            {tr('locationGate.unavailableTitle', 'Location Unavailable')}
          </h1>
          <p className="text-sm sm:text-base mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('locationGate.unavailableDesc', 'Your browser or device cannot provide a location. Please use a device with GPS or location services enabled and try again.')}
          </p>
          <button
            onClick={fetchLocation}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {tr('locationGate.tryAgain', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  // Permission denied
  if (locationPermission === 'denied' && !locationLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
        <div className="w-full max-w-md card p-6 sm:p-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emergency-100 dark:bg-emergency-900/20 flex items-center justify-center mx-auto mb-5">
            <MapPin className="w-8 h-8 text-emergency-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            {tr('locationGate.deniedTitle', 'Location Access Required')}
          </h1>
          <p className="text-sm sm:text-base mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('locationGate.deniedDesc', 'Life Sentinel needs your current location to show accurate nearby emergency resources, safe routes, community incidents, and location-based alerts. Please enable location permission in your browser/device settings and try again.')}
          </p>
          <button
            onClick={fetchLocation}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {tr('locationGate.tryAgain', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  // Loading / prompt state
  return (
    <div className="min-h-full flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md card p-6 sm:p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-sentinel-100 dark:bg-sentinel-900/20 flex items-center justify-center mx-auto mb-5">
          <Shield className="w-8 h-8 text-sentinel-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          {tr('locationGate.loadingTitle', 'Getting Your Location')}
        </h1>
        <p className="text-sm sm:text-base mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {tr('locationGate.loadingDesc', 'Life Sentinel needs your current location for accurate:')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center gap-2 p-2.5 rounded-lg"
              style={{ background: 'var(--color-bg-secondary)' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-sentinel-500" />
              <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {t(key)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <RefreshCw className="w-4 h-4 animate-spin" />
          {tr('locationGate.waiting', 'Waiting for location permission...')}
        </div>
        {!locationLoading && locationPermission === 'prompt' && (
          <button
            onClick={fetchLocation}
            className="mt-4 btn-primary w-full flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {tr('locationGate.allowLocation', 'Allow Location Access')}
          </button>
        )}
      </div>
    </div>
  );
}
