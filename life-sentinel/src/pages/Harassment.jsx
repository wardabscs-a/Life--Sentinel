import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { assessHarassmentRisk } from '../services/aiService';
import SOSButton from '../components/Layout/SOSButton';
import {
  ShieldAlert, ArrowLeft, Send, Loader2, AlertTriangle,
  FileText, Image, Clock, MapPin, Trash2, Plus, Download,
  CheckCircle, AlertOctagon, Info
} from 'lucide-react';

export default function Harassment() {
  const { t } = useLanguage();
  const { location, sosActive } = useSafety();
  const navigate = useNavigate();

  // --- AI Risk Assessment state ---
  const [situation, setSituation] = useState('');
  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState(null);

  // --- Evidence state ---
  const [evidence, setEvidence] = useState([]);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evType, setEvType] = useState('description');
  const [evDate, setEvDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [evLocation, setEvLocation] = useState('');

  // --- Risk Assessment ---
  const handleAssess = useCallback(async () => {
    if (!situation.trim() || assessing) return;
    setAssessing(true);
    setAssessment(null);
    try {
      const result = await assessHarassmentRisk(situation.trim(), t);
      setAssessment(result);
    } catch (err) {
      console.error('Risk assessment failed:', err);
      setAssessment({
        riskLevel: 'medium',
        guidance: [t('harassment.assessFailed')],
        escalateToSOS: false,
      });
    }
    setAssessing(false);
  }, [situation, assessing, t]);

  // --- Evidence ---
  const addEvidence = () => {
    if (!evTitle.trim()) return;
    const item = {
      id: Date.now().toString(),
      title: evTitle.trim(),
      description: evDescription.trim(),
      type: evType,
      date: evDate,
      location: evLocation.trim() || (location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : ''),
      timestamp: new Date().toISOString(),
    };
    setEvidence(prev => [...prev, item]);
    setEvTitle('');
    setEvDescription('');
    setEvDate(new Date().toISOString().slice(0, 16));
    setEvLocation('');
    setShowEvidenceForm(false);
  };

  const removeEvidence = (id) => {
    setEvidence(prev => prev.filter(e => e.id !== id));
  };

  const exportEvidence = () => {
    const summary = evidence.map((e, i) =>
      `${i + 1}. [${e.type.toUpperCase()}] ${e.title}\n   ${t('harassment.exportDate')} ${new Date(e.date).toLocaleString()}\n   ${t('harassment.exportLocation')} ${e.location || 'Not specified'}\n   ${t('harassment.exportDescription')} ${e.description || 'N/A'}\n`
    ).join('\n');

    const header = `${t('harassment.exportTitle')}\n${t('harassment.exportGenerated')} ${new Date().toLocaleString()}\n${t('harassment.exportLocation')} ${location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Unknown'}\n${'='.repeat(50)}\n\n`;
    const blob = new Blob([header + summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harassment-evidence-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskColors = {
    high: { bg: 'bg-emergency-50 dark:bg-emergency-900/10', border: 'border-emergency-500', text: 'text-emergency-700 dark:text-emergency-400', badge: 'badge-critical' },
    medium: { bg: 'bg-warning-50 dark:bg-warning-900/10', border: 'border-warning-500', text: 'text-warning-700 dark:text-warning-400', badge: 'badge-warning' },
    low: { bg: 'bg-safe-50 dark:bg-safe-900/10', border: 'border-safe-500', text: 'text-safe-700 dark:text-safe-400', badge: 'badge-safe' },
  };

  const evidenceTypeIcons = {
    description: FileText,
    screenshot: Image,
    message: FileText,
    other: Info,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('nav.dashboard')}
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <ShieldAlert className="w-7 h-7 text-warning-500" />
          {t('harassment.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {t('harassment.subtitle')}
        </p>
      </div>

      {/* SOS Active Banner */}
      {sosActive && (
        <div className="card p-4 bg-emergency-50 dark:bg-emergency-900/20 border-2 border-emergency-500 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-emergency-600" />
            <div>
              <p className="font-bold text-emergency-700 dark:text-emergency-400">{t('harassment.sosActive')}</p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('harassment.sosActiveDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* 1. AI SAFETY RISK ASSESSMENT */}
      {/* ============================================= */}
      <div className="card">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <ShieldAlert className="w-5 h-5 text-sentinel-500" />
          {t('harassment.aiAssessment')}
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('harassment.aiAssessmentDesc')}
        </p>

        <div className="space-y-3">
          <textarea
            value={situation}
            onChange={e => setSituation(e.target.value)}
            placeholder={t('harassment.placeholder')}
            className="input-field w-full min-h-[100px] resize-y"
            rows={4}
          />
          <button
            onClick={handleAssess}
            disabled={!situation.trim() || assessing}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {assessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {assessing ? t('assistant.thinking') : t('harassment.assessRisk')}
          </button>
        </div>

        {/* Assessment Result */}
        {assessment && (
          <div className={`mt-4 card border-l-4 ${riskColors[assessment.riskLevel]?.border || 'border-warning-500'} ${riskColors[assessment.riskLevel]?.bg || ''} animate-slide-up`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`badge ${riskColors[assessment.riskLevel]?.badge || 'badge-warning'} text-sm px-3 py-1`}>
                {assessment.riskLevel === 'high' ? t('harassment.highRisk') : assessment.riskLevel === 'medium' ? t('harassment.mediumRisk') : t('harassment.lowRisk')}
              </span>
              {assessment.escalateToSOS && (
                <span className="badge badge-critical animate-pulse flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" />
                  {t('harassment.immediateDanger')}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {assessment.guidance.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 text-sentinel-500 flex-shrink-0" />
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>{step}</p>
                </div>
              ))}
            </div>

            {assessment.escalateToSOS && (
              <div className="mt-4 p-3 rounded-lg bg-emergency-100 dark:bg-emergency-900/20 border border-emergency-300 dark:border-emergency-800">
                <p className="text-xs font-bold text-emergency-700 dark:text-emergency-400 mb-2">
                  {t('harassment.immediateDangerDesc')}
                </p>
                <div className="w-full max-w-xs">
                  <SOSButton />
                </div>
              </div>
            )}

            <p className="text-[11px] mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              {t('harassment.aiDisclaimer')}
            </p>
          </div>
        )}
      </div>

      {/* ============================================= */}
      {/* 2. EVIDENCE ORGANIZER */}
      {/* ============================================= */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <FileText className="w-5 h-5 text-sentinel-500" />
            {t('harassment.evidence')}
          </h2>
          <div className="flex gap-2">
            {evidence.length > 0 && (
              <button
                onClick={exportEvidence}
                className="text-xs font-semibold text-sentinel-600 flex items-center gap-1 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                {t('common.export')}
              </button>
            )}
            <button
              onClick={() => setShowEvidenceForm(!showEvidenceForm)}
              className="text-xs font-semibold text-sentinel-600 flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('harassment.addEntry')}
            </button>
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('harassment.evidenceDesc')}
        </p>

        {/* Add evidence form */}
        {showEvidenceForm && (
          <div className="mb-4 p-4 rounded-lg animate-slide-up" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('harassment.typeLabel')}</label>
                <select
                  value={evType}
                  onChange={e => setEvType(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="description">{t('harassment.typeIncident')}</option>
                  <option value="screenshot">{t('harassment.typeScreenshot')}</option>
                  <option value="message">{t('harassment.typeMessage')}</option>
                  <option value="other">{t('harassment.typeOther')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('harassment.dateLabel')}</label>
                <input type="datetime-local" value={evDate} onChange={e => setEvDate(e.target.value)} className="input-field w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('harassment.titleLabel')}</label>
                <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder={t('harassment.titlePlaceholder')} className="input-field w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('harassment.descLabel')}</label>
                <textarea
                  value={evDescription}
                  onChange={e => setEvDescription(e.target.value)}
                  placeholder={t('harassment.descPlaceholder')}
                  className="input-field w-full min-h-[60px]"
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('harassment.locationLabel')}</label>
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4 mt-2 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    value={evLocation}
                    onChange={e => setEvLocation(e.target.value)}
                    placeholder={location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (current)` : t('harassment.locationPlaceholder')}
                    className="input-field w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addEvidence} disabled={!evTitle.trim()} className="btn-primary text-sm disabled:opacity-50">
                {t('harassment.saveEntry')}
              </button>
              <button onClick={() => setShowEvidenceForm(false)} className="btn-ghost text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Evidence list */}
        {evidence.length > 0 ? (
          <div className="space-y-2">
            {evidence
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map(item => {
                const TypeIcon = evidenceTypeIcons[item.type] || FileText;
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                    <div className="w-8 h-8 rounded-lg bg-sentinel-500/10 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-4 h-4 text-sentinel-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="badge badge-info text-[10px]">{item.type}</span>
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                          <Clock className="w-3 h-3" />
                          {new Date(item.date).toLocaleString()}
                        </span>
                        {item.location && (
                          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{item.title}</p>
                      {item.description && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.description}</p>
                      )}
                    </div>
                    <button onClick={() => removeEvidence(item.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center p-6 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('harassment.noEntries')}
            </p>
          </div>
        )}
      </div>

      {/* ============================================= */}
      {/* 3. SOS ACTIVATION */}
      {/* ============================================= */}
      <div className="card">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <AlertOctagon className="w-5 h-5 text-emergency-500" />
          {t('harassment.sosHeading')}
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('harassment.sosDesc')}
        </p>
        <div className="max-w-xs">
          <SOSButton />
        </div>
      </div>

      {/* Emergency numbers */}
      <div className="card p-4" style={{ background: 'var(--color-bg-secondary)' }}>
        <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--color-text)' }}>{t('harassment.emergencyNumbers')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <a href="tel:15" className="flex items-center gap-2 font-semibold text-sentinel-600 hover:underline">
            <AlertTriangle className="w-3.5 h-3.5" /> {t('harassment.police')}
          </a>
          <a href="tel:1122" className="flex items-center gap-2 font-semibold text-sentinel-600 hover:underline">
            <AlertTriangle className="w-3.5 h-3.5" /> {t('harassment.rescue')}
          </a>
          <a href="tel:1099" className="flex items-center gap-2 font-semibold text-sentinel-600 hover:underline">
            <AlertTriangle className="w-3.5 h-3.5" /> {t('harassment.womenHelpline')}
          </a>
          <a href="tel:111-222-555" className="flex items-center gap-2 font-semibold text-sentinel-600 hover:underline">
            <AlertTriangle className="w-3.5 h-3.5" /> {t('harassment.cplc')}
          </a>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {t('harassment.footer')}
      </p>
    </div>
  );
}
