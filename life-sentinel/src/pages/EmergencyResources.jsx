import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { getNearbyResources } from '../services/emergencyService';
import { Building2, Phone, Navigation, MapPin, Search, Cross, Shield, Flame, Home, Truck, Loader2 } from 'lucide-react';

const TYPE_ICONS = {
  hospital: Cross,
  police: Shield,
  fire: Flame,
  shelter: Home,
  ambulance: Truck,
};
const TYPE_COLORS = {
  hospital: '#ef4444',
  police: '#3b82f6',
  fire: '#f97316',
  shelter: '#8b5cf6',
  ambulance: '#22c55e',
};

export default function EmergencyResources() {
  const { t } = useLanguage();
  const { location } = useSafety();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lat = location?.lat;
  const lng = location?.lng;

  useEffect(() => {
    if (!lat || !lng) {
      setResources([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getNearbyResources({ lat, lng }, typeFilter === 'all' ? null : typeFilter)
      .then(data => {
        if (cancelled) return;
        setResources(data || []);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Nearby resources error:', err);
        setError(t('map.fetchError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lat, lng, typeFilter, t]);

  const filteredResources = useMemo(() => {
    let result = resources;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [resources, search]);

  const types = ['all', 'hospital', 'police', 'fire', 'shelter', 'ambulance'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <Building2 className="w-7 h-7 text-sentinel-500" />
          {t('resources.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('resources.subtitle')}</p>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            className="input-field pl-10"
            placeholder={t('common.search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors ${
                typeFilter === type ? 'bg-sentinel-500 text-white' : ''
              }`}
              style={typeFilter !== type ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
            >
              {type === 'all' ? t('resources.all') : type}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error / Location states */}
      {loading && (
        <div className="card p-6 flex items-center justify-center gap-3" style={{ color: 'var(--color-text-secondary)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('map.searching')}</span>
        </div>
      )}

      {!loading && !location?.lat && (
        <div className="card p-6 text-center">
          <MapPin className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('map.allowLocation')}</p>
        </div>
      )}

      {!loading && error && (
        <div className="card p-6 text-center border border-emergency-200 dark:border-emergency-800 bg-emergency-50 dark:bg-emergency-900/10">
          <p className="font-semibold text-emergency-700 dark:text-emergency-400">{t('common.error')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
        </div>
      )}

      {/* Resource Grid */}
      {!loading && !error && location?.lat && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredResources.map(resource => {
          const TypeIcon = TYPE_ICONS[resource.type] || Building2;
          const color = TYPE_COLORS[resource.type] || '#6b7280';
          return (
            <div key={resource.id} className="card flex items-start gap-4 p-4 hover:shadow-lg transition-shadow">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15` }}
              >
                <TypeIcon className="w-6 h-6" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate" style={{ color: 'var(--color-text)' }}>{resource.name}</h3>
                <p className="text-xs capitalize mb-1" style={{ color: 'var(--color-text-secondary)' }}>{resource.type}</p>
                <div className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{resource.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                    {resource.distance}
                  </span>
                  {resource.phone && (
                    <a href={`tel:${resource.phone}`} className="flex items-center gap-1 text-xs font-semibold text-sentinel-600 hover:underline">
                      <Phone className="w-3 h-3" /> {resource.phone}
                    </a>
                  )}
                  <button className="flex items-center gap-1 text-xs font-semibold text-sentinel-600 hover:underline">
                    <Navigation className="w-3 h-3" /> {t('resources.navigate')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {!loading && !error && location?.lat && filteredResources.length === 0 && (
        <div className="card text-center p-8">
          <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('map.noResults')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('map.expandedSearch')}</p>
        </div>
      )}
    </div>
  );
}
