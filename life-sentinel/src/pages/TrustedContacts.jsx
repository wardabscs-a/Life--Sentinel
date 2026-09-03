import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafety } from '../contexts/SafetyContext';
import { shareEmergencyStatus } from '../services/emergencyService';
import { getUserProfile } from '../services/firestoreService';
import { UserCheck, Plus, Trash2, Phone, Share2, X, Send, CheckCircle, User, AlertCircle, Loader2 } from 'lucide-react';

export default function TrustedContacts() {
  const { t } = useLanguage();
  const { user, updateProfile, refreshProfile } = useAuth();
  const { location, sosActive, safetyStatus } = useSafety();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [shareResults, setShareResults] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const contacts = user?.trustedContacts || [];

  // Pull the authoritative list from Firestore when the page opens so the
  // UI reflects what is actually saved (survives refreshes).
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      setSaveError('');
      try {
        await refreshProfile();
      } catch (err) {
        if (!cancelled) setSaveError(t('contacts.loadFailed'));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim() || isSaving) return;
    setSaveError('');
    setIsSaving(true);
    try {
      // Read the authoritative list first so a stale or failed profile
      // load can never cause this write to overwrite saved contacts.
      const profile = await getUserProfile(user.uid);
      const current = Array.isArray(profile?.trustedContacts) ? profile.trustedContacts : [];

      // Block exact duplicates (same name and phone number)
      const isDuplicate = current.some(c =>
        (c.name || '').trim().toLowerCase() === name.trim().toLowerCase() &&
        (c.phone || '').replace(/\s+/g, '') === phone.replace(/\s+/g, '')
      );
      if (isDuplicate) {
        setSaveError(t('contacts.duplicate'));
        return;
      }

      const newContact = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim(),
      };

      // Wait for the Firestore write before treating the contact as saved
      await updateProfile({ trustedContacts: [...current, newContact] });

      setName('');
      setPhone('');
      setRelation('');
      setShowForm(false);
    } catch (err) {
      setSaveError(t('contacts.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (id) => {
    if (isSaving) return;
    setSaveError('');
    setIsSaving(true);
    try {
      const profile = await getUserProfile(user.uid);
      const current = Array.isArray(profile?.trustedContacts) ? profile.trustedContacts : [];
      await updateProfile({ trustedContacts: current.filter(c => c.id !== id) });
    } catch (err) {
      setSaveError(t('contacts.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async (contact) => {
    setIsSharing(true);
    try {
      const results = await shareEmergencyStatus(
        [contact],
        {
          status: sosActive ? t('contacts.sosActive') : safetyStatus,
          category: t('contacts.generalEmergency'),
          lat: location?.lat || 0,
          lng: location?.lng || 0,
        },
        t
      );
      setShareResults(results);
    } catch (err) {
      console.error(err);
    }
    setIsSharing(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
            <UserCheck className="w-7 h-7 text-sentinel-500" />
            {t('contacts.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('contacts.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('contacts.add')}
        </button>
      </div>

      {/* Save/Load Error */}
      {saveError && (
        <div className="card p-3 flex items-start gap-2 text-sm font-medium text-emergency-700 dark:text-emergency-400 border border-emergency-200 dark:border-emergency-800" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Add Contact Form */}
      {showForm && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>{t('contacts.add')}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('contacts.name')}</label>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder={t('contacts.namePlaceholder')} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('contacts.phone')}</label>
              <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{t('contacts.relation')}</label>
              <input className="input-field" value={relation} onChange={e => setRelation(e.target.value)} placeholder={t('contacts.relationPlaceholder')} />
            </div>
            <button onClick={handleAdd} disabled={!name.trim() || !phone.trim() || isSaving} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Contact List */}
      {contacts.length > 0 ? (
        <div className="space-y-3">
          {contacts.map(contact => (
            <div key={contact.id} className="card flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-sentinel-100 dark:bg-sentinel-900/30 flex items-center justify-center">
                <User className="w-6 h-6 text-sentinel-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate" style={{ color: 'var(--color-text)' }}>{contact.name}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <Phone className="w-3 h-3 inline mr-1" />
                  {contact.phone}
                  {contact.relation && <span className="ml-2 opacity-70">({contact.relation})</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleShare(contact)}
                  disabled={isSharing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sentinel-500 hover:bg-sentinel-600 transition-colors"
                  title={t('contacts.share')}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('contacts.shareLabel')}</span>
                </button>
                <button
                  onClick={() => handleRemove(contact.id)}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center p-8">
          <UserCheck className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} />
          <p className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('contacts.noContacts')}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('contacts.shareInfo')}</p>
        </div>
      )}

      {/* Share Results */}
      {shareResults && (
        <div className="card bg-safe-50 dark:bg-safe-900/10 border border-safe-200 dark:border-safe-800 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-safe-600" />
            <h3 className="font-bold text-safe-700 dark:text-safe-400">{t('contacts.statusShared')}</h3>
          </div>
          {shareResults.map((result, i) => (
            <div key={i} className="text-sm p-2 rounded" style={{ background: 'var(--color-bg-secondary)' }}>
              <p style={{ color: 'var(--color-text)' }}>
                <span className="font-semibold">{result.contact.name}</span>: {result.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
