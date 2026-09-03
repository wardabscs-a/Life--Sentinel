import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSafety } from '../../contexts/SafetyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useHoldToActivate } from '../../hooks/useHoldToActivate';
import { activateSOS as activateSOSService, deactivateSOS as deactivateSOSService } from '../../services/emergencyService';
import { apiNotifyContact } from '../../services/apiClient';
import { AlertOctagon, CheckCircle, XCircle, Loader2, MapPin, Users, ExternalLink, RotateCcw } from 'lucide-react';

export default function SOSButton({ compact = false }) {
  const { t } = useLanguage();
  const { sosActive, activateSOS, deactivateSOS, location, fetchLocation, sosNotifications, sosId } = useSafety();
  const { user } = useAuth();
  const { isHolding, progress, activated, startHold, endHold, reset } = useHoldToActivate(2000);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationResult, setActivationResult] = useState(null);
  const [showStatus, setShowStatus] = useState(false);

  // Watch for hold-to-activate completion
  React.useEffect(() => {
    if (activated) {
      setShowConfirm(true);
      reset();
    }
  }, [activated, reset]);

  const handleConfirmSOS = async () => {
    setShowConfirm(false);
    setIsActivating(true);
    setActivationResult(null);

    // Refresh location before activating
    try {
      fetchLocation();
      // Small delay for location to update
      await new Promise(r => setTimeout(r, 1500));
    } catch {}

    const contacts = user?.trustedContacts || [];
    const result = await activateSOSService({
      userId: user?.id || 'anonymous',
      location,
      contacts,
      t,
    });

    // Activate SOS in context with the result
    activateSOS(result);
    setActivationResult(result);
    setIsActivating(false);
    setShowStatus(true);
  };

  const handleDeactivate = async () => {
    await deactivateSOSService(sosId, user?.id);
    deactivateSOS();
    setShowStatus(false);
    setActivationResult(null);
  };

  const retryNotification = async (contact) => {
    // Retry individual contact notification
    try {
      await apiNotifyContact({
        contact: { name: contact.name, phone: contact.phone },
        message: activationResult?.alertMessage || 'SOS Alert',
        location: location ? { lat: location.lat, lng: location.lng } : null,
        type: 'sos',
      });
      // Update local state on success
      setActivationResult(prev => ({
        ...prev,
        notifications: [...(prev?.notifications || []), { contact, status: 'sent', method: 'retry' }],
      }));
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  // --- SOS Active State ---
  if (sosActive) {
    return (
      <>
        <button
          onClick={() => setShowStatus(!showStatus)}
          className={`w-full ${compact ? 'py-3' : 'py-4'} rounded-xl font-bold text-white bg-safe-600 hover:bg-safe-700 transition-all flex items-center justify-center gap-2`}
        >
          <AlertOctagon className="w-5 h-5" />
          <span>{t('dashboard.safe')} - {t('sos.tapToEnd')}</span>
        </button>

        {showStatus && (
          <div className="card mt-3 p-4 bg-emergency-50 dark:bg-emergency-900/10 border border-emergency-200 dark:border-emergency-800 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-emergency-500 animate-pulse" />
              <h3 className="font-bold text-emergency-700 dark:text-emergency-400">{t('sos.activated')}</h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sentinel-500" />
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {t('sos.locationSharing')}
                </span>
              </div>
              {location && (
                <p className="text-xs ml-6" style={{ color: 'var(--color-text-secondary)' }}>
                  {location.address} (±{Math.round(location.accuracy || 0)}m)
                </p>
              )}

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sentinel-500" />
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {sosNotifications.length > 0
                    ? t('sos.contactsNotifiedCount').replace('{count}', sosNotifications.length)
                    : t('sos.noContactsShort')}
                </span>
              </div>

              {/* Notification results */}
              {activationResult && (
                <div className="mt-2 space-y-1">
                  {activationResult.notifications?.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs ml-6">
                      {n.status === 'sent' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-safe-500" />
                      ) : n.status === 'ready_to_send' ? (
                        <ExternalLink className="w-3.5 h-3.5 text-sentinel-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-emergency-500" />
                      )}
                      <span style={{ color: 'var(--color-text)' }}>{n.contact.name}</span>
                      <span className="badge badge-info text-[10px]">{n.status === 'sent' ? t('sos.sent') : n.status === 'ready_to_send' ? t('sos.ready') : n.status}</span>
                      {n.smsLink && (
                        <a href={n.smsLink} className="text-sentinel-600 underline text-[10px]">{t('sos.openSms')}</a>
                      )}
                    </div>
                  ))}
                  {activationResult.errors?.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs ml-6 text-emergency-600">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{e.message}</span>
                      {e.retryable && (
                        <button onClick={() => retryNotification(e.contact)} className="underline">
                          {t('sos.retry')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activationResult?.backendNotConfigured && (
                <div className="mt-2 p-2 rounded-lg bg-warning-50 dark:bg-warning-900/20 text-xs">
                  <span className="font-semibold text-warning-700 dark:text-warning-400">
                    {t('sos.backendNotConfigured')}
                  </span> {t('sos.useSmsLinks')}
                </div>
              )}
            </div>

            <button
              onClick={handleDeactivate}
              className="w-full mt-4 py-3 rounded-lg font-bold text-white bg-safe-600 hover:bg-safe-700 transition-all text-sm"
            >
              {t('sos.endEmergency')}
            </button>
          </div>
        )}
      </>
    );
  }

  // --- Activating State ---
  if (isActivating) {
    return (
      <button
        disabled
        className={`w-full ${compact ? 'py-3' : 'py-5'} rounded-xl font-bold text-white opacity-80 flex items-center justify-center gap-2`}
        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{t('sos.activating')}</span>
      </button>
    );
  }

  // --- Idle State ---
  return (
    <>
      <button
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        className={`relative w-full ${compact ? 'py-3' : 'py-5'} rounded-xl font-bold text-white transition-all select-none overflow-hidden ${
          isHolding ? 'scale-95' : 'hover:scale-[1.02]'
        }`}
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
      >
        {isHolding && (
          <div
            className="absolute inset-0 opacity-30 rounded-xl"
            style={{
              background: `linear-gradient(90deg, rgba(255,255,255,0.4) ${progress * 100}%, transparent ${progress * 100}%)`,
            }}
          />
        )}
        <div className="relative flex items-center justify-center gap-2">
          <AlertOctagon className="w-6 h-6" />
          <span className="text-lg">
            {isHolding ? `${Math.round(progress * 100)}%` : t('dashboard.sosButton')}
          </span>
        </div>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="card max-w-sm w-full p-6 animate-slide-up" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emergency-100 dark:bg-emergency-900/30 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6 text-emergency-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{t('dashboard.sosButton')}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('dashboard.sosConfirm')}</p>
              </div>
            </div>
            {(user?.trustedContacts?.length > 0) && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--color-bg-secondary)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('sos.willNotify')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {user.trustedContacts.map(c => (
                    <span key={c.id} className="badge badge-info text-[10px]">{c.name}</span>
                  ))}
                </div>
              </div>
            )}
            {(user?.trustedContacts?.length === 0 || !user) && (
              <div className="mb-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20">
                <p className="text-xs text-warning-700 dark:text-warning-400">
                  {t('sos.noContactsDesc')}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 btn-ghost py-3"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmSOS}
                className="flex-1 btn-danger py-3"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
