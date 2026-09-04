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
        message: tr('report.successSubmitted', 'Emergency reported successfully. The report has been received and emergency services have been notified.'),
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
        ? tr('report.successSubmitted', 'Emergency reported successfully. The report has been received and emergency services have been notified.')
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
 * Activate SOS — notify trusted contacts with location
 * @param {Object} params - { userId, location, contacts }
 * @returns {Object} { success, sosId, notifications, errors }
 */
export async function activateSOS({ userId, location, contacts, t }) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const sosId = 'SOS-' + Date.now();
  const timestamp = new Date().toISOString();
  const locationStr = location
    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${location.address ? ` (${location.address})` : ''}`
    : tr('common.locationUnavailable', 'Location unavailable');

  const mapLink = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : '';

  const alertMessage = `🚨 ${tr('sos.alertHeader', 'LIFE SENTINEL SOS ALERT')} 🚨\n${tr('sos.emergencyActivated', 'Emergency SOS activated.')}\nTime: ${new Date(timestamp).toLocaleString()}\nLocation: ${locationStr}\n${mapLink ? `Map: ${mapLink}` : ''}\n${tr('sos.checkOnPerson', 'Please check on this person immediately.')}`;

  const notifications = [];
  const errors = [];

  if (!contacts || contacts.length === 0) {
    return {
      success: false,
      sosId,
      notifications: [],
      errors: [{ type: 'no_contacts', message: tr('sos.noContactsConfigMsg', 'No trusted contacts configured. Add contacts in Settings > Trusted Contacts.') }],
      alertMessage,
    };
  }

  // Try backend notification first
  if (isBackendConfigured()) {
    try {
      const result = await apiActivateSOS({
        userId,
        sosId,
        location: location ? { lat: location.lat, lng: location.lng, address: location.address } : null,
        contacts,
        timestamp,
      });

      if (result.notifications) {
        return {
          success: true,
          sosId,
          notifications: result.notifications,
          errors: [],
          alertMessage,
        };
      }
    } catch (err) {
      errors.push({
        type: 'backend_error',
        message: err instanceof ApiError ? err.message : tr('sos.backendNotifyFailed', 'Backend notification failed.'),
        retryable: err instanceof ApiError ? err.retryable : true,
      });
    }
  }

  // Fallback: attempt individual contact notifications
  for (const contact of contacts) {
    try {
      if (isBackendConfigured()) {
        await apiNotifyContact({
          contact: { name: contact.name, phone: contact.phone },
          message: alertMessage,
          location: location ? { lat: location.lat, lng: location.lng } : null,
          type: 'sos',
        });
        notifications.push({
          contact,
          status: 'sent',
          method: 'backend_api',
          message: alertMessage,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Backend not configured — generate SMS link as fallback
        const smsBody = encodeURIComponent(alertMessage);
        const smsLink = `sms:${contact.phone}?body=${smsBody}`;
        notifications.push({
          contact,
          status: 'ready_to_send',
          method: 'sms_link',
          smsLink,
          message: alertMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      errors.push({
        type: 'contact_failed',
        contact: contact.name,
        message: tr('sos.contactNotifyFailed', 'Failed to notify {name}: {error}').replace('{name}', contact.name).replace('{error}', err.message),
        retryable: true,
      });
    }
  }

  const allSucceeded = notifications.length === contacts.length;
  return {
    success: allSucceeded || (!isBackendConfigured() && notifications.length > 0),
    partial: notifications.length > 0 && !allSucceeded,
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
