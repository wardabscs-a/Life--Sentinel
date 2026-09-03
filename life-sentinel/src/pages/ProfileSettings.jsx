import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings, User, Globe, Moon, Sun, Bell, Shield, Save,
  LogOut, LogIn, ChevronRight, CheckCircle, Info, Heart,
  Zap, Map, Bot, Users, BookOpen, AlertTriangle, PlayCircle, Loader2
} from 'lucide-react';
import { resetOnboarding } from './Onboarding';

export default function ProfileSettings() {
  const { t, language, toggleLanguage } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, logout, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [medicalConditions, setMedicalConditions] = useState(user?.medicalConditions || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({ name, email, phone, bloodGroup, medicalConditions });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.warn('Profile save failed:', err.message);
    }
    setSaving(false);
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const [activeTab, setActiveTab] = useState('profile');

  const features = [
    { icon: Bot, labelKey: 'about.feat.aiAssistant', descKey: 'about.feat.aiAssistantDesc' },
    { icon: Map, labelKey: 'about.feat.resources', descKey: 'about.feat.resourcesDesc' },
    { icon: AlertTriangle, labelKey: 'about.feat.detection', descKey: 'about.feat.detectionDesc' },
    { icon: Users, labelKey: 'about.feat.community', descKey: 'about.feat.communityDesc' },
    { icon: BookOpen, labelKey: 'about.feat.guidance', descKey: 'about.feat.guidanceDesc' },
    { icon: Shield, labelKey: 'about.feat.contacts', descKey: 'about.feat.contactsDesc' },
    { icon: Zap, labelKey: 'about.feat.sos', descKey: 'about.feat.sosDesc' },
    { icon: Bell, labelKey: 'about.feat.alerts', descKey: 'about.feat.alertsDesc' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <Settings className="w-7 h-7 text-sentinel-500" />
          {t('settings.title')}
        </h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-bg-secondary)' }}>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'profile' ? 'bg-sentinel-500 text-white shadow-sm' : ''
          }`}
          style={activeTab !== 'profile' ? { color: 'var(--color-text-secondary)' } : {}}
        >
          <User className="w-4 h-4" />
          {t('settings.profile')}
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'about' ? 'bg-sentinel-500 text-white shadow-sm' : ''
          }`}
          style={activeTab !== 'about' ? { color: 'var(--color-text-secondary)' } : {}}
        >
          <Info className="w-4 h-4" />
          {t('settings.aboutUs')}
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
      <>
      {/* Profile Section */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <User className="w-5 h-5" />
          {t('settings.profile')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.name')}</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder={t('settings.namePlaceholder')} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.email')}</label>
            <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.phone')}</label>
            <input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.bloodGroup')}</label>
            <div className="flex gap-2 flex-wrap">
              {bloodGroups.map(bg => (
                <button
                  key={bg}
                  onClick={() => setBloodGroup(bg)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    bloodGroup === bg ? 'bg-emergency-500 text-white' : ''
                  }`}
                  style={bloodGroup !== bg ? { background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' } : {}}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.medicalConditions')}</label>
            <textarea
              className="input-field min-h-[80px] resize-none"
              value={medicalConditions}
              onChange={e => setMedicalConditions(e.target.value)}
              placeholder={t('settings.medicalPlaceholder')}
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? t('common.loading') : saved ? t('settings.saved') : t('settings.saveProfile')}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>{t('settings.preferences')}</h2>
        <div className="space-y-3">
          {/* Language */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-sentinel-500" />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t('settings.language')}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {language === 'en' ? 'English' : 'اردو (Urdu)'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              {language === 'en' ? t('settings.switchToUrdu') : t('settings.switchToEnglish')}
            </button>
          </div>

          {/* Dark Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-sentinel-500" /> : <Sun className="w-5 h-5 text-sentinel-500" />}
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t('settings.darkMode')}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {darkMode ? t('settings.darkModeOn') : t('settings.darkModeOff')}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`w-12 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-sentinel-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-sentinel-500" />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t('settings.notifications')}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.notifDesc')}</p>
              </div>
            </div>
            <span className="badge badge-safe">{t('common.enabled')}</span>
          </div>

          {/* Replay Tutorial */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="flex items-center gap-3">
              <PlayCircle className="w-5 h-5 text-sentinel-500" />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t('settings.replayTutorial')}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.replayDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => { resetOnboarding(); window.location.reload(); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            >
              {t('settings.replay')}
            </button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>{t('settings.account')}</h2>
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
              <Shield className="w-5 h-5 text-safe-500" />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{user.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{user.email || t('settings.noEmail')}</p>
              </div>
            </div>
            <button onClick={logout} className="btn-ghost w-full flex items-center justify-center gap-2 text-red-500">
              <LogOut className="w-4 h-4" />
              {t('settings.signOut')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('auth.loginRequired')}
            </p>
            <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" />
              {t('auth.login')}
            </Link>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <p>{t('settings.appVersion')}</p>
        <p className="mt-1">{t('settings.appTagline')}</p>
      </div>
      </>
      )}

      {/* About Us Tab */}
      {activeTab === 'about' && (
      <>
        {/* App Identity */}
        <div className="card text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-sentinel-500 to-sentinel-700 flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t('about.title')}
          </h2>
          <p className="text-sm mt-2 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('about.description')}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
            {t('about.version')} 1.0.0
          </div>
        </div>

        {/* Mission */}
        <div className="card">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Heart className="w-5 h-5 text-emergency-500" />
            {t('about.mission')}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('about.missionText')}
          </p>
        </div>

        {/* Key Features */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Zap className="w-5 h-5 text-sentinel-500" />
            {t('about.features')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                <div className="w-9 h-9 rounded-lg bg-sentinel-500/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-sentinel-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{t(f.labelKey)}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t(f.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
          <p>{t('about.team')}</p>
          <p>{t('about.openSource')}</p>
        </div>
      </>
      )}
    </div>
  );
}
