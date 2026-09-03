import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertTriangle, MessageSquare, Map, Users, Moon, Sun, Globe, ArrowRight, Phone, Heart } from 'lucide-react';

export default function Landing() {
  const { t, toggleLanguage, language } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const { user } = useAuth();

  const features = [
    { icon: AlertTriangle, titleKey: 'landing.features.emergency.title', descKey: 'landing.features.emergency.desc', color: '#ef4444' },
    { icon: MessageSquare, titleKey: 'landing.features.assistant.title', descKey: 'landing.features.assistant.desc', color: '#0ea5e9' },
    { icon: Map, titleKey: 'landing.features.map.title', descKey: 'landing.features.map.desc', color: '#22c55e' },
    { icon: Users, titleKey: 'landing.features.community.title', descKey: 'landing.features.community.desc', color: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4" style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sentinel-500 to-sentinel-700 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Life Sentinel</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700" style={{ color: 'var(--color-text)' }}>
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'اردو' : 'English'}
          </button>
          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" style={{ color: 'var(--color-text)' }}>
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 badge-info">
          <Heart className="w-4 h-4" />
          {t('landing.heroTagline')}
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6" style={{ color: 'var(--color-text)' }}>
          {t('landing.title')}
        </h1>
        <p className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('landing.subtitle')}
        </p>
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('landing.description')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? '/dashboard' : '/login'}
            className="btn-primary px-8 py-4 text-lg flex items-center gap-2"
          >
            {t('landing.getStarted')}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="tel:1122" className="btn-danger px-8 py-4 text-lg flex items-center gap-2">
            <Phone className="w-5 h-5" />
            {t('landing.call1122')}
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-8 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card flex items-start gap-4 p-6 hover:shadow-lg transition-shadow">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}15` }}
              >
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-text)' }}>{t(f.titleKey)}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t(f.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-8 py-12 max-w-6xl mx-auto">
        <div className="card p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
          {[
            { value: '24/7', label: t('landing.stat.monitoring') },
            { value: '1122', label: t('landing.stat.emergencyLine') },
            { value: 'EN/UR', label: t('landing.stat.languages') },
            { value: 'AI', label: t('landing.stat.powered') },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/80">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-4 sm:px-8 py-8 max-w-4xl mx-auto text-center">
        <p className="text-xs leading-relaxed px-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('common.disclaimer')} {t('landing.demoDisclaimer')}
        </p>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-8 py-6 text-center text-sm" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
        {t('landing.footer')}
      </footer>
    </div>
  );
}
