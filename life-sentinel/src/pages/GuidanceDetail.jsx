import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { GUIDANCE_CATEGORIES } from '../data/mockData';
import {
  Heart, Flame, Car, Cross, Waves, Mountain, AlertTriangle,
  ChevronDown, ChevronUp, ArrowLeft, Phone, BookOpen
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

export default function GuidanceDetail() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [expandedItem, setExpandedItem] = useState(0);

  const category = GUIDANCE_CATEGORIES.find(c => c.id === categoryId);

  // 404 if category doesn't exist
  if (!category) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <button
          onClick={() => navigate('/guidance')}
          className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('guidance.title')}
        </button>
        <div className="card p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-warning-500 mb-3" />
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            {t('guidance.notFound')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('guidance.notFoundDesc')}
          </p>
          <Link
            to="/guidance"
            className="btn-primary mt-4 inline-flex"
          >
            {t('guidance.backTo')} {t('guidance.title')}
          </Link>
        </div>
      </div>
    );
  }

  const Icon = ICON_MAP[category.icon] || AlertTriangle;

  const toggleItem = (index) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/guidance')}
        className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('guidance.title')}
      </button>

      {/* Page header with category icon and title */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${category.color}15` }}
        >
          <Icon className="w-7 h-7" style={{ color: category.color }} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t(category.titleKey)} {t('guidance.guidanceSuffix')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {category.items.length} {t('guidance.topicsCount')} · {t('guidance.offlineNote')}
          </p>
        </div>
      </div>

      {/* Topics list with expandable steps */}
      <div className="space-y-3">
        {category.items.map((item, i) => (
          <div key={i} className="card">
            <button
              onClick={() => toggleItem(i)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: category.color }}
                >
                  {i + 1}
                </span>
                <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                  {t(`gc.${category.id}.${i}.t`)}
                </h3>
              </div>
              {expandedItem === i ? (
                <ChevronUp className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
              ) : (
                <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
              )}
            </button>
            {expandedItem === i && (
              <div className="mt-3 space-y-2 animate-slide-up">
                {item.steps.map((step, j) => (
                  <div key={j} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                    <span
                      className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: category.color }}
                    >
                      {j + 1}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      {t(`gc.${category.id}.${i}.s${j}`)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
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
