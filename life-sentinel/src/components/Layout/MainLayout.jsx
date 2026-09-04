import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafety } from '../../contexts/SafetyContext';
import LocationGate from './LocationGate';
import {
  Menu, X, Moon, Sun, Globe, Shield, Phone, PhoneCall,
  Siren, ShieldCheck, Truck, Flame, AlertTriangle, Zap,
  LayoutDashboard, Bot, BookOpen, Settings
} from 'lucide-react';

// Emergency services for the sidebar — sourced from existing EMERGENCY_GUIDE data
const EMERGENCY_SERVICES = [
  { nameKey: 'sidebar.rescue1122', number: '1122', descKey: 'sidebar.rescue1122Desc', icon: Siren, color: '#ef4444' },
  { nameKey: 'sidebar.police', number: '15', descKey: 'sidebar.policeDesc', icon: ShieldCheck, color: '#3b82f6' },
  { nameKey: 'sidebar.edhi', number: '115', descKey: 'sidebar.edhiDesc', icon: Truck, color: '#22c55e' },
  { nameKey: 'sidebar.fireBrigade', number: '16', descKey: 'sidebar.fireBrigadeDesc', icon: Flame, color: '#f97316' },
  { nameKey: 'sidebar.motorwayPolice', number: '130', descKey: 'sidebar.motorwayPoliceDesc', icon: Shield, color: '#8b5cf6' },
  { nameKey: 'sidebar.bombDisposal', number: '111-222-555', descKey: 'sidebar.bombDisposalDesc', icon: AlertTriangle, color: '#f59e0b' },
  { nameKey: 'sidebar.wapda', number: '118', descKey: 'sidebar.wapdaDesc', icon: Zap, color: '#eab308' },
];

// Bottom navigation items
const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'navBar.dashboard' },
  { path: '/assistant', icon: Bot, labelKey: 'navBar.assistant' },
  { path: '/guidance', icon: BookOpen, labelKey: 'navBar.guidance' },
  { path: '/settings', icon: Settings, labelKey: 'navBar.settings' },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, toggleLanguage, language } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const { location } = useSafety();
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const currentPath = routerLocation.pathname;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Emergency Services Only */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sentinel-500 to-sentinel-700 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text)' }}>Life Sentinel</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('sidebar.tagline')} · {t('sidebar.management')}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Services */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {t('sidebar.emergencyServices')}
          </p>
          <div className="space-y-1">
            {EMERGENCY_SERVICES.map((service, i) => (
              <a
                key={i}
                href={`tel:${service.number}`}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${service.color}15` }}
                >
                  <service.icon className="w-4.5 h-4.5" style={{ color: service.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{t(service.nameKey)}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{t(service.descKey)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-sentinel-500 group-hover:text-sentinel-600 transition-colors" />
                  <span className="text-sm font-bold text-sentinel-600">{service.number}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            {t('sidebar.tapToCall')}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Branding */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sentinel-500 to-sentinel-700 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-sm sm:text-base" style={{ color: 'var(--color-text)' }}>Life Sentinel</h1>
              <p className="text-[10px] sm:text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('sidebar.tagline')}</p>
            </div>
          </div>
        
          {/* Spacer pushes controls to the right */}
          <div className="flex-1" />
        
          {/* Right side controls — Call, Language, Dark mode */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Emergency call buttons */}
            <a
              href="tel:1122"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('topbar.call1122')}</span>
              <span className="sm:hidden">1122</span>
            </a>
            <a
              href="tel:15"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('topbar.call15')}</span>
              <span className="sm:hidden">15</span>
            </a>
        
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'var(--color-text)' }}
              title={language === 'en' ? t('settings.switchToUrdu') : t('settings.switchToEnglish')}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'en' ? '\u0627\u0631\u062F\u0648' : 'English'}</span>
            </button>
        
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              style={{ color: 'var(--color-text)' }}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Page content — gated on location for all protected routes */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20" style={{ background: 'var(--color-bg-secondary)' }}>
          <LocationGate>
            <Outlet />
          </LocationGate>
        </main>

        {/* Bottom Navigation Bar */}
        <nav
          className="flex-shrink-0 flex items-center border-t safe-area-bottom"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {NAV_ITEMS.map(item => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 transition-colors ${
                  isActive ? 'text-sentinel-600' : ''
                }`}
                style={isActive ? { color: '#0284C7' } : { color: 'var(--color-nav-inactive)' }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] sm:text-xs font-medium leading-none truncate">
                  {t(item.labelKey)}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-sentinel-500 mt-0.5" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
