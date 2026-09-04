import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWeather, getWeatherAlerts } from '../services/weatherService';
import { reverseGeocode } from '../services/placesService';
import { useLanguage } from './LanguageContext';

const SafetyContext = createContext(null);

export function SafetyProvider({ children }) {
  const { t, language } = useLanguage();
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'granted', 'denied', 'prompt', 'unavailable'
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState('safe');
  const [emergencyReports, setEmergencyReports] = useState([]);
  const [sosTimestamp, setSosTimestamp] = useState(null);
  const [sosId, setSosId] = useState(null);
  const [sosNotifications, setSosNotifications] = useState([]);

  // Weather state
  const [currentWeather, setCurrentWeather] = useState(null);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // Watch position ref for continuous tracking during SOS
  const watchIdRef = useRef(null);

  // --- Location ---
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('[Life Sentinel] Geolocation API is not supported by this browser.');
      setLocation(null);
      setLocationPermission('unavailable');
      setLocationError({ code: 0, message: 'Geolocation is not supported by this browser.' });
      setLocationLoading(false);
      return;
    }

    console.log('[Life Sentinel] Location request started.');
    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const coordAddr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        const newLoc = {
          lat: latitude,
          lng: longitude,
          accuracy,
          address: coordAddr,
        };
        console.log('[Life Sentinel] Location successfully received:', newLoc);
        setLocation(newLoc);
        setLocationPermission('granted');
        setLocationLoading(false);

        // Async reverse geocode for a friendly city name
        reverseGeocode(latitude, longitude).then(friendly => {
          if (friendly !== coordAddr) {
            setLocation(prev => prev && prev.lat === latitude && prev.lng === longitude
              ? { ...prev, address: friendly } : prev);
          }
        });
      },
      (err) => {
        console.warn('[Life Sentinel] Geolocation error:', err.code, err.message);
        setLocation(null);
        setLocationError({ code: err.code, message: err.message });

        if (err.code === 1) {
          // PERMISSION_DENIED
          setLocationPermission('denied');
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setLocationPermission('unavailable');
        } else if (err.code === 3) {
          // TIMEOUT
          setLocationPermission('unavailable');
        } else {
          setLocationPermission('unavailable');
        }
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  // Check permission state and request location on mount
  useEffect(() => {
    let permissionStatusRef = null;

    const checkPermissionAndFetch = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
          permissionStatusRef = permissionStatus;
          console.log('[Life Sentinel] Geolocation permission state:', permissionStatus.state);
          setLocationPermission(permissionStatus.state); // 'granted', 'prompt', or 'denied'

          // Listen for permission changes (e.g., user resets permission in browser settings)
          const handleChange = () => {
            console.log('[Life Sentinel] Geolocation permission state changed:', permissionStatus.state);
            setLocationPermission(permissionStatus.state);
            if (permissionStatus.state === 'granted') {
              fetchLocation();
            }
          };
          permissionStatus.onchange = handleChange;

          // Always attempt to fetch; if state is 'denied', getCurrentPosition will fail quickly.
          fetchLocation();
        } catch (err) {
          console.warn('[Life Sentinel] Could not query geolocation permission:', err);
          fetchLocation();
        }
      } else {
        console.log('[Life Sentinel] Permissions API not supported; attempting geolocation directly.');
        fetchLocation();
      }
    };

    checkPermissionAndFetch();

    return () => {
      if (permissionStatusRef) {
        permissionStatusRef.onchange = null;
      }
    };
  }, [fetchLocation]);

  // --- Weather (fetch when location changes) ---
  useEffect(() => {
    if (!location) return;

    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError(null);

    Promise.all([
      getCurrentWeather(location.lat, location.lng, t).catch(err => {
        console.warn('Current weather unavailable:', err.message);
        return null;
      }),
      getWeatherAlerts(location.lat, location.lng, t).catch(err => {
        console.warn('Weather alerts unavailable:', err.message);
        return [];
      }),
    ]).then(([weather, alerts]) => {
      if (cancelled) return;
      setCurrentWeather(weather);
      setWeatherAlerts(alerts || []);
      setWeatherLoading(false);

      // Update safety status based on weather
      if (alerts?.some(a => a.severity === 'critical' || a.severity === 'high')) {
        if (!sosActive) setSafetyStatus('caution');
      }
    });

    return () => { cancelled = true; };
  }, [location?.lat, location?.lng, sosActive, language]);

  // --- SOS ---
  const activateSOS = useCallback((result) => {
    setSosActive(true);
    const ts = new Date().toISOString();
    setSosTimestamp(ts);
    setSafetyStatus('danger');

    if (result) {
      setSosId(result.sosId);
      setSosNotifications(result.notifications || []);
    }

    // Start continuous location tracking during SOS
    if (navigator.geolocation && watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const coordAddr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocation({
            lat: latitude,
            lng: longitude,
            accuracy,
            address: coordAddr,
          });
          // Async reverse geocode for a friendly city name
          reverseGeocode(latitude, longitude).then(friendly => {
            if (friendly !== coordAddr) {
              setLocation(prev => prev && prev.lat === latitude && prev.lng === longitude
                ? { ...prev, address: friendly } : prev);
            }
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }
  }, []);

  const deactivateSOS = useCallback(() => {
    setSosActive(false);
    setSosTimestamp(null);
    setSosId(null);
    setSosNotifications([]);
    setSafetyStatus('safe');

    // Stop continuous location tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const addEmergencyReport = (report) => {
    setEmergencyReports(prev => [{ ...report, id: report.id || Date.now().toString(), timestamp: report.timestamp || new Date().toISOString() }, ...prev]);
  };

  return (
    <SafetyContext.Provider value={{
      // Location
      location, setLocation, locationPermission, locationLoading, locationError, fetchLocation,
      // SOS
      sosActive, activateSOS, deactivateSOS, sosTimestamp, sosId, sosNotifications,
      // Safety
      safetyStatus, setSafetyStatus,
      // Reports
      emergencyReports, addEmergencyReport,
      // Weather
      currentWeather, weatherAlerts, weatherLoading, weatherError,
    }}>
      {children}
    </SafetyContext.Provider>
  );
}

export const useSafety = () => {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafety must be used within SafetyProvider');
  return ctx;
};

export default SafetyContext;
