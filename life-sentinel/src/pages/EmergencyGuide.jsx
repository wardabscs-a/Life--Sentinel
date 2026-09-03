import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { EMERGENCY_GUIDE } from '../data/mockData';
import {
  BookOpen, Heart, DoorOpen, Phone, AlertTriangle, ChevronDown,
  ChevronUp, Wifi, WifiOff
} from 'lucide-react';

export default function EmergencyGuide() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('firstAid');
  const [expandedItem, setExpandedItem] = useState(null);

  const sections = [
    { id: 'firstAid', icon: Heart, labelKey: 'guide.firstAid', color: '#ef4444', data: EMERGENCY_GUIDE.firstAid, gcKey: 'firstAid' },
    { id: 'evacuation', icon: DoorOpen, labelKey: 'guide.evacuation', color: '#f59e0b', data: EMERGENCY_GUIDE.evacuation, gcMap: ['fire', 'flood', 'earthquake'] },
    { id: 'emergencyNumbers', icon: Phone, labelKey: 'guide.emergencyNumbers', color: '#3b82f6', data: EMERGENCY_GUIDE.emergencyNumbers },
    { id: 'basicInstructions', icon: AlertTriangle, labelKey: 'guide.basicInstructions', color: '#8b5cf6', data: EMERGENCY_GUIDE.basicInstructions, gcMap: ['general', 'general', 'general'], gcIdxOffset: [0, 1, 2] },
  ];

  const currentSection = sections.find(s => s.id === activeSection);

  const toggleExpand = (index) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <BookOpen className="w-7 h-7 text-sentinel-500" />
          {t('guide.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('guide.subtitle')}</p>
      </div>

      {/* Offline notice */}
      <div className="card p-3 flex items-center gap-3" style={{ background: 'var(--color-bg-secondary)' }}>
        <WifiOff className="w-5 h-5 text-safe-600" />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {t('guide.offlineNote')}
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => { setActiveSection(section.id); setExpandedItem(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === section.id ? 'bg-sentinel-500 text-white' : ''
            }`}
            style={activeSection !== section.id ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
          >
            <section.icon className="w-4 h-4" />
            {t(section.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeSection === 'emergencyNumbers' ? (
          /* Emergency Numbers - special layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: '1122', number: '1122' },
              { key: '15', number: '15' },
              { key: '115', number: '115' },
              { key: '16', number: '16' },
              { key: '130', number: '130' },
              { key: 'bomb', number: '111-222-555' },
              { key: '118', number: '118' },
            ].map((item, i) => (
              <a
                key={i}
                href={`tel:${item.number}`}
                className="card flex items-center gap-4 p-4 hover:shadow-lg transition-all hover:scale-[1.01]"
              >
                <div className="w-12 h-12 rounded-xl bg-emergency-100 dark:bg-emergency-900/30 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-emergency-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{t(`enum.${item.key}.name`)}</h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t(`enum.${item.key}.desc`)}</p>
                </div>
                <span className="text-xl font-black text-emergency-600">{item.number}</span>
              </a>
            ))}
          </div>
        ) : (
          /* Accordion items */
          currentSection?.data.map((item, i) => {
            // Compute gc key for translated title + steps
            let titleKey = null;
            let stepKeyPrefix = null;
            if (currentSection.gcKey) {
              titleKey = `gc.${currentSection.gcKey}.${i}.t`;
              stepKeyPrefix = `gc.${currentSection.gcKey}.${i}`;
            } else if (currentSection.gcMap) {
              const cat = currentSection.gcMap[i];
              const idx = currentSection.gcIdxOffset ? currentSection.gcIdxOffset[i] : 0;
              titleKey = `gc.${cat}.${idx}.t`;
              stepKeyPrefix = `gc.${cat}.${idx}`;
            }
            return (
              <div key={i} className="card">
                <button
                  onClick={() => toggleExpand(i)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                    {titleKey ? t(titleKey) : item.title}
                  </h3>
                  {expandedItem === i ? (
                    <ChevronUp className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                  )}
                </button>
                {expandedItem === i && (
                  <div className="mt-3 space-y-2 animate-slide-up">
                    {item.steps.map((step, j) => (
                      <div key={j} className="flex items-start gap-3 p-2 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                        <span className="w-6 h-6 rounded-full bg-sentinel-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {j + 1}
                        </span>
                        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                          {stepKeyPrefix ? t(`${stepKeyPrefix}.s${j}`) : step}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {t('guide.offlineNoteAlt')}
      </p>
    </div>
  );
}
