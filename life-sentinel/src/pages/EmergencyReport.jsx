import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafety } from '../contexts/SafetyContext';
import { useAuth } from '../contexts/AuthContext';
import { classifyEmergency, analyzeImage } from '../services/aiService';
import { submitEmergencyReport } from '../services/emergencyService';
import { EMERGENCY_CATEGORIES, SEVERITY_LEVELS } from '../data/mockData';
import {
  AlertTriangle, Mic, MicOff, Image, Upload, Send, CheckCircle,
  Camera, Loader2, Info, RefreshCw, ChevronDown, XCircle, RotateCcw, MapPin
} from 'lucide-react';

export default function EmergencyReport() {
  const { t } = useLanguage();
  const { location, locationPermission, addEmergencyReport } = useSafety();
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recorderError, setRecorderError] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [classification, setClassification] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioURLRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioURLRef.current) URL.revokeObjectURL(audioURLRef.current);
    };
  }, []);

  const handleClassify = async () => {
    if (!description.trim()) return;
    setIsClassifying(true);
    try {
      const result = await classifyEmergency(description);
      setClassification(result);
      setSelectedCategory(result.category);
    } catch (err) {
      console.error('Classification error:', err);
    }
    setIsClassifying(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));

    setAnalyzingImage(true);
    try {
      const result = await analyzeImage(file, t);
      setImageAnalysis(result);
    } catch (err) {
      console.error('Image analysis error:', err);
    }
    setAnalyzingImage(false);
  };

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mpeg'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const stopMicrophoneTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    setRecorderError(null);

    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setRecorderError(t('report.recorderNotSupported'));
      return;
    }

    if (audioURLRef.current) {
      URL.revokeObjectURL(audioURLRef.current);
      audioURLRef.current = null;
    }
    setAudioBlob(null);
    setAudioURL(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        audioURLRef.current = url;
        setAudioBlob(blob);
        setAudioURL(url);
        stopMicrophoneTracks();
      };

      mediaRecorder.onerror = () => {
        setRecorderError(t('report.recorderError'));
        stopMicrophoneTracks();
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      stopMicrophoneTracks();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRecorderError(t('report.micPermissionDenied'));
      } else {
        setRecorderError(err.message || t('report.recorderError'));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRecordAgain = () => {
    startRecording();
  };

  // Auto-submit: sends immediately when user clicks "Report Emergency"
  const handleSubmit = async () => {
    if (isSubmitting) return; // prevent duplicate submissions
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const report = {
        description,
        category: selectedCategory || classification?.category || 'other',
        severity: classification?.severity || 'medium',
        location: location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy } : null,
        address: location?.address || t('common.locationUnavailable'),
        image: image ? image.name : null,
        imageAnalysis,
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Unknown',
        userPhone: user?.phone || null,
      };

      const result = await submitEmergencyReport(report, t);
      setSubmitResult(result);

      if (result.success) {
        addEmergencyReport({ ...report, id: result.id, status: result.status, timestamp: new Date().toISOString() });
        setSubmitted(true);
      }
    } catch (err) {
      setSubmitResult({
        success: false,
        error: err.message,
        retryable: true,
        message: t('report.unexpectedError'),
      });
    }
    setIsSubmitting(false);
  };

  const handleReset = () => {
    setDescription('');
    setImage(null);
    setImagePreview(null);
    setClassification(null);
    setSelectedCategory(null);
    setImageAnalysis(null);
    setSubmitted(false);
    setSubmitResult(null);
    if (audioURLRef.current) URL.revokeObjectURL(audioURLRef.current);
    audioURLRef.current = null;
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
    setRecorderError(null);
    stopMicrophoneTracks();
  };

  // ===== SUCCESS STATE =====
  if (submitted && submitResult?.success) {
    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div className="card text-center p-8">
          <div className="w-16 h-16 rounded-full bg-safe-100 dark:bg-safe-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-safe-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            {t('report.successTitle')}
          </h2>
          <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {submitResult.message}
          </p>
          <div className="card mt-4 p-4 text-left" style={{ background: 'var(--color-bg-secondary)' }}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('report.reportId')}</span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{submitResult.id}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('report.category')}</span>
                <span className="font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{selectedCategory || classification?.category}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('report.severity')}</span>
                <span className="font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{classification?.severity || 'medium'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('report.location')}</span>
                <span className="font-semibold text-right" style={{ color: 'var(--color-text)' }}>{location?.address || t('common.unknown')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('report.time')}</span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{new Date().toLocaleString()}</span>
              </div>
              {submitResult.status === 'stored_locally' && (
                <div className="mt-2 p-2 rounded bg-warning-50 dark:bg-warning-900/20 text-xs">
                  <span className="font-semibold text-warning-700 dark:text-warning-400">
                    {t('report.backendNotConfigured')}
                  </span> {t('report.storedLocally')}
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="font-semibold text-warning-700 dark:text-warning-400 mb-1">{t('common.important')}</p>
            <p>{t('report.callForHelp')}</p>
          </div>
          <button onClick={handleReset} className="btn-primary mt-6 w-full">
            <RefreshCw className="w-4 h-4 inline mr-2" />
            {t('report.reportAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <AlertTriangle className="w-7 h-7 text-emergency-500" />
          {t('report.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('report.subtitle')}</p>
      </div>

      {/* Description Input */}
      <div className="card">
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          {t('report.describeLabel')}
        </label>
        <textarea
          className="input-field min-h-[120px] resize-none text-base"
          placeholder={t('report.textPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {!audioURL && (
            <button
              onClick={handleVoiceRecording}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isRecording
                  ? 'bg-emergency-100 text-emergency-700 dark:bg-emergency-900/30 dark:text-emergency-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={!isRecording ? { color: 'var(--color-text-secondary)' } : {}}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? t('report.voiceStop') : t('report.voiceStart')}
            </button>
          )}

          {isRecording && (
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              <span className="w-2 h-2 rounded-full bg-emergency-500 animate-pulse" />
              {formatRecordingTime(recordingTime)}
            </span>
          )}

          {audioURL && !isRecording && (
            <>
              <audio controls src={audioURL} className="h-8 max-w-[180px] sm:max-w-[240px]" />
              <button
                onClick={handleRecordAgain}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <RotateCcw className="w-4 h-4" />
                {t('report.recordAgain')}
              </button>
            </>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Camera className="w-4 h-4" />
            {t('report.imageUpload')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          <button
            onClick={handleClassify}
            disabled={!description.trim() || isClassifying}
            className="ml-auto btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            {isClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            {isClassifying ? t('common.loading') : t('common.analyze')}
          </button>
        </div>

        {recorderError && (
          <div className="mt-2 text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="text-emergency-500 font-medium">{t('common.error')}:</span>
            {recorderError}
          </div>
        )}
      </div>

      {/* Image Preview & Analysis */}
      {imagePreview && (
        <div className="card">
          <h3 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{t('report.uploadedImage')}</h3>
          <div className="rounded-lg overflow-hidden mb-3" style={{ maxHeight: '250px' }}>
            <img src={imagePreview} alt={t('report.uploadedImage')} className="w-full object-cover" style={{ maxHeight: '250px' }} />
          </div>
          {analyzingImage && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> {t('report.analyzing')}
            </div>
          )}
          {imageAnalysis && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--color-bg-secondary)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-sentinel-500" />
                <span className="font-semibold badge-info px-2 py-0.5 rounded-full text-xs">{t('common.aiGenerated')}</span>
              </div>
              <p className="mb-2" style={{ color: 'var(--color-text)' }}>{imageAnalysis.description}</p>
              {imageAnalysis.hazards.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {imageAnalysis.hazards.map((h, i) => <span key={i} className="badge badge-warning">{h}</span>)}
                </div>
              )}
              <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('report.imageWarning')}</p>
            </div>
          )}
        </div>
      )}

      {/* Classification Results */}
      {classification && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>{t('report.aiClassification')}</h3>

          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
              {t('report.detectedCategory')}
            </label>
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="input-field flex items-center justify-between cursor-pointer"
              >
                <span className="capitalize font-semibold">{selectedCategory || 'other'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg overflow-hidden shadow-lg" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  {EMERGENCY_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setShowCategoryDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors capitalize ${
                        selectedCategory === cat.id ? 'bg-sentinel-500/10 font-semibold' : ''
                      }`}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {t(`report.categories.${cat.id}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('report.correctCategory')}</p>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
              {t('report.detectedSeverity')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {SEVERITY_LEVELS.map(sev => (
                <span
                  key={sev.id}
                  className={`badge px-3 py-1.5 text-sm ${
                    classification.severity === sev.id
                      ? sev.id === 'critical' ? 'badge-critical' : sev.id === 'high' ? 'badge-warning' : sev.id === 'medium' ? 'badge-warning' : 'badge-safe'
                      : ''
                  }`}
                  style={classification.severity !== sev.id ? { opacity: 0.4, background: 'var(--color-bg-secondary)' } : {}}
                >
                  {t(`report.severity.${sev.id}`)}
                </span>
              ))}
            </div>
          </div>

          {classification.keywords?.length > 0 && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>{t('report.detectedKeywords')}</label>
              <div className="flex flex-wrap gap-1">
                {classification.keywords.map((kw, i) => <span key={i} className="badge badge-info">{kw}</span>)}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'var(--color-bg-secondary)' }}>
            <MapPin className="w-4 h-4 text-sentinel-500" />
            <span style={{ color: 'var(--color-text-secondary)' }}>{t('report.location')} </span>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{location?.address || t('common.unknown')}</span>
          </div>
        </div>
      )}

      {/* Submission Error */}
      {submitResult && !submitResult.success && (
        <div className="card p-4 bg-emergency-50 dark:bg-emergency-900/10 border border-emergency-200 dark:border-emergency-800 animate-slide-up">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-emergency-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-emergency-700 dark:text-emergency-400 mb-1">{t('report.submissionFailed')}</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{submitResult.message}</p>
              {submitResult.code && (
                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-secondary)' }}>{t('report.error')} {submitResult.code}</p>
              )}
            </div>
            {submitResult.retryable && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-danger flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                {t('common.retry')}
              </button>
            )}
          </div>
          <div className="mt-3 p-2 rounded-lg text-xs bg-warning-50 dark:bg-warning-900/20">
            {t('report.retryHelp')}
          </div>
        </div>
      )}

      {/* Submit — auto-submits on click */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={(!description.trim() && !classification) || isSubmitting}
          className="flex-1 btn-danger py-4 text-lg flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {isSubmitting ? t('common.submitting') : t('report.submit')}
        </button>
      </div>

      {/* Location permission warning */}
      {locationPermission === 'denied' && (
        <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 flex items-start gap-3 text-sm">
          <MapPin className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning-700 dark:text-warning-400">{t('report.locationDenied')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('report.locationDeniedHelp')}
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {t('common.disclaimer')}
      </p>
    </div>
  );
}
