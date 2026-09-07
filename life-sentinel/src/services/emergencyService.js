// Emergency service — handles emergency report lifecycle, SOS, and data retrieval
// Uses backend API when configured, falls back to mock data for demo
// Never simulates success — always reports actual outcome honestly

import { MOCK_ALERTS, MOCK_COMMUNITY_INCIDENTS, MOCK_ROUTES } from '../data/mockData';
import { isBackendConfigured, apiSubmitReport, apiActivateSOS, apiDeactivateSOS, apiNotifyContact, apiGetResources, ApiError } from './apiClient';
import { getWeatherAlerts } from './weatherService';
import { fetchNearbyResources, haversineDistance } from './placesService';
import { saveReportToFirestore } from './firestoreService';

// ===== Emergency Report Submission =====

/**
 * Submit an emergency report.
 * Attempts backend first. If backend is not configured or fails, returns honest result.
 * NEVER claims success if the submission actually failed.
 *
 * @param {Object} report - { category, severity, description, location, address, userId, image }
 * @returns {Object} { success, id, status, message, error?, retryable? }
 */
export async function submitEmergencyReport(report, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const fullReport = {
    ...report,
    timestamp: new Date().toISOString(),
    clientTimestamp: new Date().toISOString(),
    reportId: 'RPT-' + Date.now(),
  };

  if (isBackendConfigured()) {
    try {
      const result = await apiSubmitReport(fullReport);
      return {
        success: true,
        id: result.id || fullReport.reportId,
        status: 'submitted',
        message: tr('report.successSubmitted', 'Emergency report recorded successfully. Your emergency details and location have been saved to Life Sentinel.'),
        backendResponse: result,
      };
    } catch (err) {
      if (err instanceof ApiError) {
        return {
          success: false,
          error: err.message,
          retryable: err.retryable,
          code: err.code,
          message: tr('report.submitFailedMsg', 'Failed to submit emergency report: {error}').replace('{error}', err.message),
        };
      }
      return {
        success: false,
        error: tr('report.unexpectedError', 'An unexpected error occurred while submitting your report.'),
        retryable: true,
        message: tr('report.submitFailedRetry', 'Failed to submit emergency report. Please try again.'),
      };
    }
  }

  // Backend not configured — store locally + Firestore, be honest about it
  try {
    const stored = {
      ...fullReport,
      id: fullReport.reportId,
      status: 'stored_locally',
    };
    // Save to localStorage for offline persistence
    const existing = JSON.parse(localStorage.getItem('ls_reports') || '[]');
    existing.unshift(stored);
    localStorage.setItem('ls_reports', JSON.stringify(existing.slice(0, 50)));

    // Also persist to Firestore if user is authenticated
    let firestoreSaved = false;
    if (fullReport.userId) {
      try {
        await saveReportToFirestore({ ...stored, userId: fullReport.userId });
        firestoreSaved = true;
      } catch (fbErr) {
        console.warn('Firestore report save failed:', fbErr.message);
      }
    }

    return {
      success: true,
      id: stored.id,
      status: firestoreSaved ? 'submitted' : 'stored_locally',
      message: firestoreSaved
        ? tr('report.successSubmitted', 'Emergency report recorded successfully. Your emergency details and location have been saved to Life Sentinel.')
        : tr('report.savedLocallyMsg', 'Emergency report saved locally. Backend server is not configured — please call emergency services directly (1122) for immediate help.'),
      backendNotConfigured: !firestoreSaved,
    };
  } catch (err) {
    return {
      success: false,
      error: tr('report.saveFailedLocal', 'Failed to save report locally.'),
      retryable: true,
      message: tr('report.saveFailedMsg', 'Failed to save emergency report. Please call emergency services directly (1122).'),
    };
  }
}

// ===== SOS Activation =====

/**
 * Activate SOS — send location + alert to trusted contacts.
 *
 * Backend mode (VITE_BACKEND_URL set): the backend verifies the Firebase user,
 * reads trusted contacts from Firestore (server-side), stores the SOS event,
 * and attempts automatic SMS delivery through the configured provider.
 * It returns honest per-contact statuses:
 *   sent           → provider confirmed submission
 *   ready_to_send  → no provider configured; SMS deep link provided
 *   failed         → provider/provider call failed
 *
 * If the backend is unreachable or errors, we fall back to the local
 * SMS deep-link flow so SOS still works offline.
 *
 * @param {Object} params - { userId, location, contacts, t }
 * @returns {Object} { success, sosId, notifications, errors }
 */
export async function activateSOS({ userId, location, contacts, t }) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const sosId = 'SOS-' + Date.now();
  const timestamp = new Date().toISOString();
  const hasLocation = location && Number.isFinite(location.lat) && Number.isFinite(location.lng);
  const locationStr = hasLocation
    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${location.address ? ` (${location.address})` : ''}`
    : tr('common.locationUnavailable', 'Location unavailable');

  const mapLink = hasLocation
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : '';

  const alertMessage =
    `🚨 ${tr('sos.alertHeader', 'LIFE SENTINEL SOS ALERT')} 🚨\n` +
    `${tr('sos.emergencyActivated', 'Emergency SOS activated.')}\n` +
    `Time: ${new Date(timestamp).toLocaleString()}\n` +
    `Location: ${locationStr}\n` +
    (mapLink ? `Map: ${mapLink}\n` : '') +
    `${tr('sos.checkOnPerson', 'Please check on this person immediately.')} ` +
    `${tr('sos.contactEmergencyServices', 'If they are in danger, contact emergency services (1122) or go to their location.')}`;

  // --- Backend mode: server handles contacts, storage, and SMS delivery ---
  if (isBackendConfigured()) {
    try {
      const result = await apiActivateSOS({
        userId,
        location: hasLocation
          ? {
              lat: location.lat,
              lng: location.lng,
              accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null,
              address: location.address || null,
            }
          : null,
        timestamp,
        message: alertMessage,
      });
      if (result && Array.isArray(result.notifications)) {
        return result;
      }
    } catch (err) {
      // Backend unavailable/errored — fall through to the local SMS-link fallback
      console.warn('Backend SOS activation failed, using local SMS-link fallback:', err.message);
    }
  }

  // --- Local fallback: per-contact SMS deep links the user taps to send ---
  const notifications = [];
  const errors = [];

  if (!contacts || contacts.length === 0) {
    return {
      success: false,
      sosId,
      notifications: [],
      errors: [
        {
          type: 'no_contacts',
          message: tr('sos.noContactsConfigMsg', 'No trusted contacts configured. Add contacts in Settings > Trusted Contacts.'),
        },
      ],
      alertMessage,
    };
  }

  for (const contact of contacts) {
    const name = contact?.name || 'Unknown';
    const phone = (contact?.phone || '').trim();
    const smsLink = phone ? `sms:${phone}?body=${encodeURIComponent(alertMessage)}` : null;

    notifications.push({
      contact: { name, phone },
      status: 'ready_to_send',
      method: 'sms_link',
      ...(smsLink ? { smsLink } : {}),
      message: alertMessage,
      timestamp: new Date().toISOString(),
    });

    if (!smsLink) {
      errors.push({
        type: 'invalid_contact',
        contact: name,
        message: tr('sos.contactNotifyFailed', 'Failed to notify {name}: {error}')
          .replace('{name}', name)
          .replace('{error}', 'missing phone number'),
        retryable: false,
      });
    }
  }

  return {
    success: notifications.length > 0,
    sosId,
    notifications,
    errors,
    alertMessage,
    backendNotConfigured: !isBackendConfigured(),
  };
}

/**
 * Deactivate SOS
 */
export async function deactivateSOS(sosId, userId) {
  if (isBackendConfigured()) {
    try {
      await apiDeactivateSOS({ sosId, userId });
    } catch (err) {
      console.error('Failed to deactivate SOS on backend:', err);
    }
  }
}

// ===== Data Retrieval =====

/**
 * Get nearby emergency resources based on location and category.
 * Uses backend API when configured, otherwise queries the real Overpass API.
 * Throws an error if the API fails so callers can show a clear error state
 * instead of silently showing placeholder/demo data.
 */
export async function getNearbyResources(location, category) {
  if (isBackendConfigured() && location) {
    try {
      const resources = await apiGetResources(location.lat, location.lng, category);
      return resources;
    } catch (err) {
      console.error('Backend resources failed, trying Overpass:', err);
    }
  }

  // Use real Overpass API data (OpenStreetMap)
  if (location) {
    try {
      const { resources } = await fetchNearbyResources(location.lat, location.lng, category);
      return resources;
    } catch (err) {
      console.error('Overpass resources failed:', err);
      throw err;
    }
  }

  throw new Error('Location is required to fetch nearby resources.');
}

/**
 * Get active alerts — merges weather alerts (real API) with local emergency alerts
 */
export async function getActiveAlerts(location, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const ALERT_RADIUS_KM = 50; // Show alerts within 50 km of user

  let weatherAlerts = [];
  if (location) {
    try {
      weatherAlerts = await getWeatherAlerts(location.lat, location.lng, t);
    } catch (err) {
      console.error('Weather alerts unavailable:', err);
    }
  }

  // Merge weather alerts with local/mock emergency alerts (filtered by proximity)
  const emergencyAlerts = MOCK_ALERTS
    .filter(a => {
      // If user has no location, show all alerts (fallback)
      if (!location) return true;
      // Filter by distance if alert has coordinates
      if (a.lat != null && a.lng != null) {
        return haversineDistance(location.lat, location.lng, a.lat, a.lng) <= ALERT_RADIUS_KM;
      }
      return true; // Show alerts without coordinates as a fallback
    })
    .map(a => ({
      ...a,
      title: tr(`mock.alert.${a.id}.title`, a.title),
      description: tr(`mock.alert.${a.id}.desc`, a.description),
      source: tr(`mock.alert.${a.id}.source`, a.source),
      location: tr(`mock.alert.${a.id}.location`, a.location),
      isWeather: false,
      isOfficial: false,
    }));

  return [...weatherAlerts, ...emergencyAlerts];
}

/**
 * Get community incidents near a location
 */
export async function getCommunityIncidents(location, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  return MOCK_COMMUNITY_INCIDENTS.map(i => ({
    ...i,
    title: tr(`mock.incident.${i.id}.title`, i.title),
    description: tr(`mock.incident.${i.id}.desc`, i.description),
  }));
}

/**
 * Get route/hazard information
 */
export async function getRoutes(location, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  return MOCK_ROUTES.map(r => ({
    ...r,
    reason: tr(`mock.route.${r.id}.reason`, r.reason),
  }));
}

/**
 * Send emergency status to trusted contacts (non-SOS sharing)
 */
export async function shareEmergencyStatus(contacts, info, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const timestamp = new Date().toISOString();
  const locationStr = info.lat && info.lng
    ? `${info.lat.toFixed(5)}, ${info.lng.toFixed(5)}`
    : tr('common.locationUnavailable', 'Location unavailable');
  const mapLink = info.lat && info.lng
    ? `https://www.google.com/maps?q=${info.lat},${info.lng}`
    : '';

  const message = tr('contacts.statusMessage', 'Life Sentinel Status Update:\nStatus: {status}\nCategory: {category}\nTime: {time}\nLocation: {location}')
    .replace('{status}', info.status || tr('common.unknown', 'Unknown'))
    .replace('{category}', info.category || tr('contacts.generalEmergency', 'General'))
    .replace('{time}', new Date(timestamp).toLocaleString())
    .replace('{location}', locationStr + (mapLink ? `\nMap: ${mapLink}` : ''));

  const results = [];
  for (const contact of contacts) {
    if (isBackendConfigured()) {
      try {
        await apiNotifyContact({
          contact: { name: contact.name, phone: contact.phone },
          message,
          location: info.lat ? { lat: info.lat, lng: info.lng } : null,
          type: 'status_update',
        });
        results.push({ contact, status: 'sent', message, timestamp });
      } catch (err) {
        results.push({ contact, status: 'failed', error: err.message, message, timestamp });
      }
    } else {
      const smsBody = encodeURIComponent(message);
      results.push({
        contact,
        status: 'ready_to_send',
        method: 'sms_link',
        smsLink: `sms:${contact.phone}?body=${smsBody}`,
        message,
        timestamp,
      });
    }
  }
  return results;
}

/**
 * Generate shareable emergency link
 */
export function generateEmergencyLink(info) {
  const params = new URLSearchParams({
    type: 'emergency',
    lat: info.lat || '',
    lng: info.lng || '',
    category: info.category || '',
    timestamp: new Date().toISOString(),
  });
  return `${window.location.origin}/emergency?${params.toString()}`;
}
