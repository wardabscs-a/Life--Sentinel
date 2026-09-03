import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSafety } from '../contexts/SafetyContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Zap, FileText, Bot, MapPinned, Map, Route, Bell,
  Users, ShieldAlert, BookOpen, ChevronRight, ChevronLeft,
  X, Shield, MapPin, CheckCircle
} from 'lucide-react';

const ONBOARDING_KEY = 'lifesentinel_onboarding_complete';

export function isOnboardingComplete() {
  try { return localStorage.getItem(ONBOARDING_KEY) === 'true'; }
  catch { return false; }
}

export function resetOnboarding() {
  try { localStorage.removeItem(ONBOARDING_KEY); } catch {}
}

function completeOnboarding() {
  try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
}

const STEPS = [
  {
    id: 'sos',
    icon: Zap,
    color: '#ef4444',
    titleKey: 'onboarding.1.title',
    descKey: 'onboarding.1.desc',
  },
  {
    id: 'report',
    icon: FileText,
    color: '#f59e0b',
    titleKey: 'onboarding.2.title',
    descKey: 'onboarding.2.desc',
  },
  {
    id: 'ai',
    icon: Bot,
    color: '#8b5cf6',
    titleKey: 'onboarding.3.title',
    descKey: 'onboarding.3.desc',
  },
  {
    id: 'resources',
    icon: MapPinned,
    color: '#0ea5e9',
    titleKey: 'onboarding.4.title',
    descKey: 'onboarding.4.desc',
  },
  {
    id: 'map',
    icon: Map,
    color: '#10b981',
    titleKey: 'onboarding.5.title',
    descKey: 'onboarding.5.desc',
  },
  {
    id: 'routes',
    icon: Route,
    color: '#8b5cf6',
    titleKey: 'onboarding.6.title',
    descKey: 'onboarding.6.desc',
  },
  {
    id: 'alerts',
    icon: Bell,
    color: '#f59e0b',
    titleKey: 'onboarding.7.title',
    descKey: 'onboarding.7.desc',
  },
  {
    id: 'community',
    icon: Users,
    color: '#ec4899',
    titleKey: 'onboarding.8.title',
    descKey: 'onboarding.8.desc',
  },
  {
    id: 'harassment',
    icon: ShieldAlert,
    color: '#d946ef',
    titleKey: 'onboarding.9.title',
    descKey: 'onboarding.9.desc',
  },
  {
    id: 'guide',
    icon: BookOpen,
    color: '#14b8a6',
    titleKey: 'onboarding.10.title',
    descKey: 'onboarding.10.desc',
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [locationRequested, setLocationRequested] = useState(false);
  const navigate = useNavigate();
  const { locationPermission, fetchLocation } = useSafety();
  const { t } = useLanguage();

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleFinish = useCallback(() => {
    completeOnboarding();
    onComplete();
    navigate('/dashboard', { replace: true });
  }, [onComplete, navigate]);

  const handleNext = useCallback(() => {
    // Request location permission after AI step (step index 2)
    if (step === 2 && !locationRequested && locationPermission === 'prompt') {
      setLocationRequested(true);
      fetchLocation(); // Triggers the browser permission dialog
    }
    if (isLast) {
      handleFinish();
    } else {
      setStep(s => s + 1);
    }
  }, [step, isLast, locationRequested, locationPermission, fetchLocation, handleFinish]);

  const handleBack = useCallback(() => {
    if (!isFirst) setStep(s => s - 1);
  }, [isFirst]);

  const handleSkip = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-lg mx-auto px-6 flex flex-col items-center" style={{ minHeight: '90vh', justifyContent: 'center' }}>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? '24px' : '8px',
                height: '8px',
                background: i === step ? currentStep.color : i < step ? '#94a3b8' : 'var(--color-border)',
              }}
            />
          ))}
        </div>

        {/* Step counter */}
        <p className="text-xs font-medium mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.stepOf').replace('{current}', step + 1).replace('{total}', STEPS.length)}
        </p>

        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 animate-fade-in"
          style={{ background: `${currentStep.color}15` }}
        >
          <StepIcon className="w-10 h-10" style={{ color: currentStep.color }} />
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold text-center mb-3 animate-fade-in"
          style={{ color: 'var(--color-text)' }}
        >
          {t(currentStep.titleKey)}
        </h2>

        {/* Description */}
        <p
          className="text-sm text-center leading-relaxed mb-6 max-w-sm animate-fade-in"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(currentStep.descKey)}
        </p>

        {/* Location permission status indicator */}
        {step >= 3 && locationRequested && (
          <div className="mb-4 flex items-center gap-2 text-xs animate-fade-in" style={{ color: 'var(--color-text-secondary)' }}>
            {locationPermission === 'granted' ? (
              <>
                <CheckCircle className="w-4 h-4 text-safe-500" />
                {t('onboarding.locationEnabled')}
              </>
            ) : locationPermission === 'denied' ? (
              <>
                <MapPin className="w-4 h-4 text-warning-500" />
                {t('onboarding.locationDenied')}
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-sentinel-500 animate-pulse" />
                {t('onboarding.locationRequesting')}
              </>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleBack}
            disabled={isFirst}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            <ChevronLeft className="w-4 h-4" /> {t('common.back')}
          </button>
          <button
            onClick={handleNext}
            className="flex-[1.5] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: currentStep.color }}
          >
            {isLast ? t('onboarding.getStarted') : t('common.next')}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="mt-4 text-xs font-medium transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
}
