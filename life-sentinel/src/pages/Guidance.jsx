import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { GUIDANCE_CATEGORIES } from '../data/mockData';
import {
  Heart, Flame, Car, Cross, Waves, Mountain, AlertTriangle,
  BookOpen, WifiOff, Phone
} from 'lucide-react';

const ICON_MAP = {
  Heart,
  Flame,
  Car,
  Cross,
  Waves,
  Mountain,
  AlertTriangle,
};

export default function Guidance() {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <BookOpen className="w-7 h-7 text-sentinel-500" />
          {t('guidance.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {t('guidance.subtitle')}
        </p>
      </div>

      {/* Offline notice */}
      <div className="card p-3 flex items-center gap-3" style={{ background: 'var(--color-bg-secondary)' }}>
        <WifiOff className="w-5 h-5 text-safe-600 flex-shrink-0" />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {t('guidance.offlineNote')}
        </p>
      </div>

      {/* Category grid — each card navigates to /guidance/:id */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {GUIDANCE_CATEGORIES.map(cat => {
          const Icon = ICON_MAP[cat.icon] || AlertTriangle;
          return (
            <Link
              key={cat.id}
              to={`/guidance/${cat.id}`}
              className="card flex flex-col items-center gap-3 p-4 text-center transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: `${cat.color}15` }}
              >
                <Icon className="w-7 h-7" style={{ color: cat.color }} />
              </div>
              <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
                {t(cat.titleKey)}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {cat.items.length} {t('guidance.steps').toLowerCase()}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Emergency call reminder */}
      <div className="card p-4 flex items-center gap-4" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="w-12 h-12 rounded-xl bg-emergency-100 dark:bg-emergency-900/30 flex items-center justify-center flex-shrink-0">
          <Phone className="w-6 h-6 text-emergency-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
            {t('guidance.disclaimer')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('guidance.callInfo')}
          </p>
        </div>
      </div>
    </div>
  );
}
