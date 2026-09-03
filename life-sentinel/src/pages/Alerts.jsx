import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { getActiveAlerts } from '../services/emergencyService';
import { Bell, CloudRain, Waves, AlertTriangle, Flame, CheckCircle, ShieldAlert, Clock, Info, CloudLightning, Loader2, MapPin, RefreshCw, Shield, ChevronDown, ChevronUp } from 'lucide-react';

// Map alert types to guidance category IDs and precaution steps
const ALERT_TYPE_TO_GUIDANCE = {
  flood: 'flood',
  fire: 'fire',
  road: 'roadAccident',
  thunderstorm: 'general',
  weather: 'general',
  other: 'general',
};

function getPrecautions(t, type) {
  const keys = {
    flood: [1,2,3,4,5,6].map(i => t(`precautions.flood.${i}`)),
    thunderstorm: [1,2,3,4,5,6].map(i => t(`precautions.thunderstorm.${i}`)),
    weather: [1,2,3,4,5,6].map(i => t(`precautions.weather.${i}`)),
    fire: [1,2,3,4,5,6].map(i => t(`precautions.fire.${i}`)),
    road: [1,2,3,4,5,6].map(i => t(`precautions.road.${i}`)),
    other: [1,2,3,4,5,6].map(i => t(`precautions.other.${i}`)),
  };
  return keys[type] || keys.other;
}

const ALERT_ICONS = {
  weather: CloudRain,
  flood: Waves,
  road: AlertTriangle,
  fire: Flame,
  thunderstorm: CloudLightning,
  other: Bell,
};

export default function Alerts() {
  const { t, language } = useLanguage();
  const { location } = useSafety();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedPrecautions, setExpandedPrecautions] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActiveAlerts(location, t);
      setAlerts(result);
    } catch (err) {
      console.error('Alerts fetch error:', err);
      setError(t('alerts.loadError'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, [location?.lat, location?.lng, language]);

  const filteredAlerts = filter === 'all'
    ? alerts
    : filter === 'weather_official'
      ? alerts.filter(a => a.isWeather)
      : filter === 'emergency'
        ? alerts.filter(a => !a.isWeather)
        : alerts.filter(a => a.type === filter);

  const alertTypes = ['all', 'weather_official', 'emergency', 'weather', 'flood', 'thunderstorm', 'road', 'fire', 'other'];

  // Counts
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium').length;
  const lowCount = alerts.filter(a => a.severity === 'low').length;
  const weatherCount = alerts.filter(a => a.isWeather).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
            <Bell className="w-7 h-7 text-warning-500" />
            {t('alerts.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('alerts.subtitle')}</p>
        </div>
        <button onClick={fetchAlerts} disabled={loading} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('alerts.refresh')}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t('alerts.critical'), count: criticalCount, color: 'text-emergency-600' },
          { label: t('alerts.high'), count: highCount, color: 'text-warning-600' },
          { label: t('alerts.medium'), count: mediumCount, color: 'text-yellow-600' },
          { label: t('alerts.low'), count: lowCount, color: 'text-safe-600' },
          { label: t('alerts.weatherLabel'), count: weatherCount, color: 'text-sentinel-600' },
        ].map(item => (
          <div key={item.label} className="card p-3 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {alertTypes.map(type => {
          const label = type === 'all' ? t('alerts.allAlerts')
            : type === 'weather_official' ? t('alerts.weatherOfficial')
            : type === 'emergency' ? t('alerts.emergency')
            : t(`alerts.${type}`);
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors ${
                filter === type ? 'bg-sentinel-500 text-white' : ''
              }`}
              style={filter !== type ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-sentinel-500" />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('alerts.loadingAlerts')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('alerts.loadingDesc')}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card p-4 bg-emergency-50 dark:bg-emergency-900/10 border border-emergency-200 dark:border-emergency-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-emergency-600" />
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>{error}</p>
            <button onClick={fetchAlerts} className="btn-ghost text-sm ml-auto">{t('common.retry')}</button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {!loading && (
        <div className="space-y-4">
          {filteredAlerts.map(alert => {
            const Icon = ALERT_ICONS[alert.type] || Bell;
            const sevColors = {
              critical: { border: 'border-emergency-500', bg: 'bg-emergency-50 dark:bg-emergency-900/10', badge: 'badge-critical' },
              high: { border: 'border-warning-500', bg: 'bg-warning-50 dark:bg-warning-900/10', badge: 'badge-warning' },
              medium: { border: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10', badge: 'badge-warning' },
              low: { border: 'border-safe-500', bg: 'bg-safe-50 dark:bg-safe-900/10', badge: 'badge-safe' },
            };
            const colors = sevColors[alert.severity] || sevColors.medium;

            return (
              <div key={alert.id} className={`card border-l-4 ${colors.border} ${colors.bg} animate-slide-up`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-bg-secondary)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge ${colors.badge}`}>{t(`report.severity.${alert.severity}`)}</span>
                      {alert.isOfficial ? (
                        <span className="badge badge-safe flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {t('alerts.official')}
                        </span>
                      ) : alert.verified ? (
                        <span className="badge badge-safe flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {t('common.verified')}
                        </span>
                      ) : (
                        <span className="badge badge-info flex items-center gap-1">
                          <Info className="w-3 h-3" /> {t('common.unverified')}
                        </span>
                      )}
                      {alert.isWeather && (
                        <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                          {t('alerts.weatherBadge')}
                        </span>
                      )}
                      <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                        {t(`alerts.${alert.type}`)}
                      </span>
                    </div>
                    <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-text)' }}>{alert.title}</h3>
                    <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>{alert.description}</p>

                    {/* Recommendation */}
                    {alert.recommendation && (
                      <div className="p-2 rounded-lg mb-2 text-xs" style={{ background: 'var(--color-bg-secondary)' }}>
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('alerts.recommendedAction')} </span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{alert.recommendation}</span>
                      </div>
                    )}

                    {/* Precautions Button */}
                    <div className="flex items-center gap-2 mt-2 mb-1 flex-wrap">
                      <button
                        onClick={() => setExpandedPrecautions(expandedPrecautions === alert.id ? null : alert.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                      >
                        <Shield className="w-3.5 h-3.5 text-sentinel-500" />
                        {t('alerts.precautions')}
                        {expandedPrecautions === alert.id
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <Link
                        to={`/guidance/${ALERT_TYPE_TO_GUIDANCE[alert.type] || 'general'}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sentinel-600 transition-colors"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                      >
                        {t('alerts.viewFullGuide')}
                      </Link>
                    </div>

                    {/* Expanded Precautions */}
                    {expandedPrecautions === alert.id && (
                      <div className="mt-2 p-3 rounded-lg animate-fade-in" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                        <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-text)' }}>{t('alerts.safetyPrecautionsFor')} {t(`alerts.${alert.type}`)} {t('alerts.emergencies')}</p>
                        <ul className="space-y-1.5">
                          {getPrecautions(t, alert.type).map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              <CheckCircle className="w-3.5 h-3.5 text-safe-500 mt-0.5 flex-shrink-0" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> {alert.source}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(alert.timestamp).toLocaleString()}
                      </span>
                      {alert.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {alert.location}
                        </span>
                      )}
                      {alert.expires && (
                        <span className="flex items-center gap-1 text-[11px]">
                          {t('alerts.expires')} {new Date(alert.expires).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredAlerts.length === 0 && (
        <div className="card text-center p-8">
          <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('alerts.noAlerts')}</p>
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {t('alerts.footer')}
      </p>
    </div>
  );
}
