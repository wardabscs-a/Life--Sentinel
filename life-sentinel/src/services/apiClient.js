// API Client — centralized backend communication
// Configure VITE_BACKEND_URL in .env to point to your backend server
// When not configured, operates in demo mode with clear error states
// All authenticated requests include a Firebase ID token in the Authorization header

import { auth } from './firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const hasBackend = BACKEND_URL && BACKEND_URL !== 'https://your-backend-api.com';

export function isBackendConfigured() {
  return hasBackend;
}

/**
 * Get a fresh Firebase ID token for the current user.
 * Returns null if no user is signed in.
 */
async function getIdToken() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (err) {
    console.warn('Could not get Firebase ID token:', err.message);
    return null;
  }
}

/**
 * Generic API request helper — attaches Firebase ID token automatically
 * @param {string} endpoint - API endpoint path (e.g. '/reports')
 * @param {Object} options - fetch options
 * @returns {Object} API response
 */
async function apiRequest(endpoint, options = {}) {
  if (!hasBackend) {
    throw new ApiError(
      'BACKEND_NOT_CONFIGURED',
      'Backend server is not configured. Set VITE_BACKEND_URL in your .env file.',
      false
    );
  }

  const url = `${BACKEND_URL}${endpoint}`;

  // Build headers — attach Firebase ID token for authentication
  const idToken = await getIdToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkError) {
    throw new ApiError(
      'NETWORK_ERROR',
      `Cannot connect to the server. Please check your internet connection.`,
      true // retryable
    );
  }

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch { /* response may not be JSON */ }

    throw new ApiError(
      `HTTP_${response.status}`,
      errorBody?.message || errorBody?.error || `Server error (${response.status})`,
      response.status >= 500 // retryable for 5xx
    );
  }

  return response.json();
}

/**
 * Structured API error
 */
export class ApiError extends Error {
  constructor(code, message, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
  }
}

// === Emergency Report Endpoints ===

/**
 * Submit emergency report to backend
 * @param {Object} report
 * @returns {Object} { id, status, message, timestamp }
 */
export async function apiSubmitReport(report) {
  return apiRequest('/api/reports', {
    method: 'POST',
    body: JSON.stringify(report),
  });
}

/**
 * Activate SOS on backend — triggers trusted contact notifications
 * @param {Object} data - { userId, location, contacts, timestamp }
 * @returns {Object} { success, notifications: [{ contact, status }] }
 */
export async function apiActivateSOS(data) {
  return apiRequest('/api/sos/activate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Deactivate SOS on backend
 * @param {Object} data - { userId, sosId }
 */
export async function apiDeactivateSOS(data) {
  return apiRequest('/api/sos/deactivate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Send notification to a single trusted contact
 * @param {Object} data - { contact, message, location, type }
 */
export async function apiNotifyContact(data) {
  return apiRequest('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update user location on backend
 * @param {Object} data - { userId, lat, lng, accuracy, timestamp }
 */
export async function apiUpdateLocation(data) {
  return apiRequest('/api/location/update', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Fetch active emergency incidents near a location
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 */
export async function apiGetIncidents(lat, lng, radiusKm = 10) {
  return apiRequest(`/api/incidents?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
}

/**
 * Fetch emergency resources near a location
 * @param {number} lat
 * @param {number} lng
 * @param {string} type - optional filter
 */
export async function apiGetResources(lat, lng, type) {
  const params = `lat=${lat}&lng=${lng}${type ? `&type=${type}` : ''}`;
  return apiRequest(`/api/resources?${params}`);
}

// === Admin / Dispatch Endpoints ===

/**
 * Get dashboard stats (admin only)
 */
export async function apiGetAdminStats() {
  return apiRequest('/api/admin/stats');
}

/**
 * Get all emergency reports (admin only)
 * @param {Object} filters - { status, limit, userId }
 */
export async function apiGetAllReports(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.userId) params.set('userId', filters.userId);
  const qs = params.toString();
  return apiRequest(`/api/reports${qs ? `?${qs}` : ''}`);
}

/**
 * Get a single report by ID (owner or admin)
 */
export async function apiGetReport(reportId) {
  return apiRequest(`/api/reports/${reportId}`);
}

/**
 * Update report status (admin only)
 * @param {string} reportId
 * @param {string} status - NEW | ACKNOWLEDGED | ASSIGNED | RESOLVED
 * @param {Object} meta - { notes, assignedTo }
 */
export async function apiUpdateReportStatus(reportId, status, meta = {}) {
  return apiRequest(`/api/reports/${reportId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...meta }),
  });
}

/**
 * Get SOS events (admin only)
 */
export async function apiGetSOSEvents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiRequest(`/api/admin/sos-events${qs ? `?${qs}` : ''}`);
}

/**
 * Resolve an SOS event (admin only)
 */
export async function apiResolveSOS(sosId, notes = '') {
  return apiRequest(`/api/admin/sos-events/${sosId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}
