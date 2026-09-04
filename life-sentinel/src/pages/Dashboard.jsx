import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin, AlertTriangle, Map, Bell, Route,
  Users, Shield, Zap, Activity, Bot, ArrowRight, UserCheck,
  Thermometer, MapPinned, ShieldAlert,
  Phone, Siren, ShieldCheck, Truck, Flame, AlertTriangle as AlertTriangleIcon
} from 'lucide-react';
import SOSButton from '../components/Layout/SOSButton';
import { MOCK_ALERTS, MOCK_COMMUNITY_INCIDENTS, MOCK_ROUTES } from '../data/mockData';
import { haversineDistance } from '../services/placesService';

// Emergency contacts shown compactly at the bottom of the Dashboard
const EMERGENCY_CONTACTS = [
  { nameKey: 'sidebar.rescue1122', number: '1122', icon: Siren, color: '#ef4444' },
  { nameKey: 'sidebar.police', number: '15', icon: ShieldCheck, color: '#3b82f6' },
  { nameKey: 'sidebar.edhi', number: '115', icon: Truck, color: '#22c55e' },
  { nameKey: 'sidebar.fireBrigade', number: '16', icon: Flame, color: '#f97316' },
  { nameKey: 'sidebar.motorwayPolice', number: '130', icon: Shield, color: '#8b5cf6' },
  { nameKey: 'sidebar.bombDisposal', number: '111-222-555', icon: AlertTriangleIcon, color: '#f59e0b' },
  { nameKey: 'sidebar.wapda', number: '118', icon: Zap, color: '#eab308' },
];

export default function Dashboard() {
  const { t } = useLanguage();
  const { location, sosActive, safetyStatus, weatherAlerts, currentWeather, locationPermission } = useSafety();
  const { user } = useAuth();

  const statusColors = {
    safe: { bg: 'bg-safe-100 dark:bg-safe-900/20', text: 'text-safe-700 dark:text-safe-400', icon: Shield },
    caution: { bg: 'bg-warning-100 dark:bg-warning-900/20', text: 'text-warning-700 dark:text-warning-400', icon: AlertTriangle },
    danger: { bg: 'bg-emergency-100 dark:bg-emergency-900/20', text: 'text-emergency-700 dark:text-emergency-400', icon: Zap },
  };

  const status = statusColors[safetyStatus] || statusColors.safe;
  const StatusIcon = status.icon;

  // Derive summary counts for card badges (location-aware)
  const NEARBY_RADIUS = 5; // km — consistent with Community/SafeRoutes pages
  const ALERT_RADIUS = 50; // km — consistent with Alerts page
  const nearbyMockAlerts = MOCK_ALERTS.filter(a => {
    if (!location || locationPermission !== 'granted') return true;
    if (a.lat != null && a.lng != null) {
      return haversineDistance(location.lat, location.lng, a.lat, a.lng) <= ALERT_RADIUS;
    }
    return true;
  });
  const allAlerts = [...(weatherAlerts || []), ...nearbyMockAlerts];
  const activeAlertCount = allAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  // Only count incidents/routes that are near the user's current location
  const isNearby = (lat, lng) => {
    if (!location || locationPermission !== 'granted') return true; // no location = show all
    return haversineDistance(location.lat, location.lng, lat, lng) <= NEARBY_RADIUS;
  };
  const activeIncidents = MOCK_COMMUNITY_INCIDENTS.filter(i => i.status === 'active' && isNearby(i.lat, i.lng)).length;
  const hazardousRoutes = MOCK_ROUTES.filter(r => {
    if (r.status !== 'hazardous') return false;
    const coords = r.coordinates?.[0];
    if (!coords) return false;
    return isNearby(coords[0], coords[1]);
  }).length;
  const contactCount = user?.trustedContacts?.length || 0;

  // The 5 primary category cards
  const categories = [
    {
      id: 'resources',
      label: t('dashboard.nearbyResources'),
      desc: t('dashboard.desc.resources'),
      icon: MapPinned,
      color: '#0ea5e9',
      to: '/map',
      badge: null,
      badgeColor: null,
    },
    {
      id: 'alerts',
      label: t('dashboard.activeAlerts'),
      desc: t('dashboard.desc.alerts'),
      icon: Bell,
      color: '#f59e0b',
      to: '/alerts',
      badge: activeAlertCount > 0 ? activeAlertCount : null,
      badgeColor: 'bg-warning-500',
    },
    {
      id: 'routes',
      label: t('dashboard.safeRoutes'),
      desc: t('dashboard.desc.routes'),
      icon: Route,
      color: '#8b5cf6',
      to: '/routes',
      badge: hazardousRoutes > 0 ? hazardousRoutes : null,
      badgeColor: 'bg-emergency-500',
    },
    {
      id: 'contacts',
      label: t('nav.contacts'),
      desc: t('dashboard.desc.contacts'),
      icon: UserCheck,
      color: '#22c55e',
      to: '/contacts',
      badge: contactCount > 0 ? contactCount : null,
      badgeColor: 'bg-safe-500',
    },
    {
      id: 'community',
      label: t('dashboard.communityIncidents'),
      desc: t('dashboard.desc.community'),
      icon: Users,
      color: '#ec4899',
      to: '/community',
      badge: activeIncidents > 0 ? activeIncidents : null,
      badgeColor: 'bg-sentinel-500',
    },
    {
      id: 'harassment',
      label: t('nav.harassment'),
      desc: t('dashboard.desc.harassment'),
      icon: ShieldAlert,
      color: '#d946ef',
      to: '/harassment',
      badge: null,
      badgeColor: null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header: Title + SOS & Report Emergency */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t('dashboard.title')}
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {user ? t('dashboard.welcomeBack').replace('{name}', user.name) : t('dashboard.noUserGreeting')}
          </p>
          <div className="flex items-center gap-2 text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            <MapPin className="w-4 h-4" />
            <span>{location ? location.address : t('dashboard.locationUnknown')}</span>
          </div>
        </div>

        {/* SOS + Report Emergency side by side */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-stretch">
          <div className="w-full sm:w-48">
            <SOSButton />
          </div>
          <Link
            to="/report"
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold text-white btn-danger whitespace-nowrap text-sm sm:text-base"
          >
            <AlertTriangle className="w-5 h-5" />
            {t('dashboard.reportEmergency')}
          </Link>
        </div>
      </div>

      {/* SOS Active Banner */}
      {sosActive && (
        <div className="card p-4 bg-emergency-50 dark:bg-emergency-900/20 border-2 border-emergency-500 animate-pulse">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-emergency-600" />
            <div>
              <p className="font-bold text-emergency-700 dark:text-emergency-400">{t('dashboard.sosActive')}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('dashboard.sosActiveDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Safety Status + AI Assistant side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Safety Status */}
        <div className={`card dashboard-card flex items-center gap-3 sm:gap-4 ${safetyStatus === 'caution' ? 'dashboard-status-caution' : status.bg}`}>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${status.bg}`}>
            <StatusIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${status.text}`} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('dashboard.safetyStatus')}</p>
            <p className={`text-xl font-bold ${status.text}`}>{t(`dashboard.${safetyStatus}`)}</p>
          </div>
          {currentWeather && (
            <div className="hidden sm:flex items-center gap-2 text-sm ml-2" style={{ color: 'var(--color-text-secondary)' }}>
              <Thermometer className="w-4 h-4" />
              <span>{currentWeather.temperature}°C — {currentWeather.description}</span>
            </div>
          )}
          {activeAlertCount > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <Bell className="w-4 h-4 text-warning-500" />
              <span>{activeAlertCount} {t('dashboard.highPriorityAlerts')}</span>
            </div>
          )}
        </div>

        {/* AI Emergency Assistant — prominent link */}
        <Link to="/assistant" className="card dashboard-card dashboard-assistant-card dashboard-card--interactive block transition-all hover:scale-[1.005]">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-sentinel-500/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-sentinel-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{t('dashboard.aiAssistant')}</h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('dashboard.aiAssistantDesc')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
          </div>
        </Link>
      </div>

      {/* === ICON-DRIVEN CATEGORY GRID === */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              to={cat.to}
              className="card dashboard-card dashboard-card--interactive group relative flex flex-col items-center gap-2 sm:gap-4 p-3 sm:p-6 text-center transition-all hover:scale-[1.01]"
            >
              {/* Badge */}
              {cat.badge != null && (
                <span className={`absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full text-white text-[10px] sm:text-xs font-bold flex items-center justify-center ${cat.badgeColor}`}>
                  {cat.badge}
                </span>
              )}

              {/* Icon */}
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${cat.color}12` }}
              >
                <Icon className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: cat.color }} />
              </div>

              {/* Label */}
              <div>
                <h3 className="font-semibold sm:font-bold text-xs sm:text-base mb-0.5 sm:mb-1" style={{ color: 'var(--color-text)' }}>
                  {cat.label}
                </h3>
                <p className="text-[10px] sm:text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {cat.desc}
                </p>
              </div>

              {/* Subtle arrow indicator */}
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--color-text-secondary)' }} />
            </Link>
          );
        })}
      </div>

      {/* Emergency Contacts */}
      <div className="card p-3 sm:p-4">
        <h2 className="text-sm sm:text-base font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-sentinel-500" />
          {t('dashboard.emergencyContacts')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {EMERGENCY_CONTACTS.map((contact, i) => {
            const Icon = contact.icon;
            return (
              <a
                key={i}
                href={`tel:${contact.number}`}
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
                style={{ background: 'var(--color-bg-secondary)' }}
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${contact.color}15` }}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: contact.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {t(contact.nameKey)}
                  </p>
                  <p className="text-[10px] sm:text-xs font-bold text-sentinel-600">{contact.number}</p>
                </div>
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-sentinel-500" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-center px-4" style={{ color: 'var(--color-text-secondary)' }}>
        {t('common.disclaimer')}
      </p>
    </div>
  );
}
