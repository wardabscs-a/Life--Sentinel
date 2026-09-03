// Weather Service — integrates with Open-Meteo API (free, no API key required)
// Provides current weather, forecasts, and severe weather alerts
// Replace with premium API (e.g. OpenWeatherMap, WeatherAPI) when keys are configured

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const OPENWEATHER_API_URL = import.meta.env.VITE_OPENWEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

const hasPremiumWeather = OPENWEATHER_API_KEY && OPENWEATHER_API_KEY !== 'your_api_key';

// WMO Weather codes → human-readable + severity mapping
const WMO_CODES = {
  0: { desc: 'Clear sky', severity: null },
  1: { desc: 'Mainly clear', severity: null },
  2: { desc: 'Partly cloudy', severity: null },
  3: { desc: 'Overcast', severity: null },
  45: { desc: 'Foggy', severity: 'low' },
  48: { desc: 'Depositing rime fog', severity: 'low' },
  51: { desc: 'Light drizzle', severity: null },
  53: { desc: 'Moderate drizzle', severity: null },
  55: { desc: 'Dense drizzle', severity: 'low' },
  56: { desc: 'Light freezing drizzle', severity: 'low' },
  57: { desc: 'Dense freezing drizzle', severity: 'medium' },
  61: { desc: 'Slight rain', severity: null },
  63: { desc: 'Moderate rain', severity: 'low' },
  65: { desc: 'Heavy rain', severity: 'medium' },
  66: { desc: 'Light freezing rain', severity: 'medium' },
  67: { desc: 'Heavy freezing rain', severity: 'high' },
  71: { desc: 'Slight snow', severity: null },
  73: { desc: 'Moderate snow', severity: 'low' },
  75: { desc: 'Heavy snow', severity: 'medium' },
  77: { desc: 'Snow grains', severity: 'low' },
  80: { desc: 'Slight rain showers', severity: null },
  81: { desc: 'Moderate rain showers', severity: 'low' },
  82: { desc: 'Violent rain showers', severity: 'high' },
  85: { desc: 'Slight snow showers', severity: 'low' },
  86: { desc: 'Heavy snow showers', severity: 'medium' },
  95: { desc: 'Thunderstorm', severity: 'high' },
  96: { desc: 'Thunderstorm with slight hail', severity: 'high' },
  99: { desc: 'Thunderstorm with heavy hail', severity: 'critical' },
};

function getWeatherInfo(code, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const desc = tr(`weather.${code}`, WMO_CODES[code]?.desc || 'Unknown');
  return { desc, severity: WMO_CODES[code]?.severity ?? null };
}

/**
 * Get current weather conditions for a location
 * @param {number} lat
 * @param {number} lng
 * @param {Function} [t] - translation function
 * @returns {Object} { temperature, windspeed, humidity, weatherCode, description, isSevere }
 */
export async function getCurrentWeather(lat, lng, t) {
  if (hasPremiumWeather) {
    return getPremiumCurrentWeather(lat, lng, t);
  }

  const url = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
  const data = await response.json();

  const current = data.current;
  const info = getWeatherInfo(current.weather_code, t);

  return {
    temperature: current.temperature_2m,
    windspeed: current.wind_speed_10m,
    humidity: current.relative_humidity_2m,
    precipitation: current.precipitation,
    weatherCode: current.weather_code,
    description: info.desc,
    isSevere: info.severity !== null,
    severity: info.severity,
    source: 'Open-Meteo',
    timestamp: current.time,
  };
}

/**
 * Get multi-day weather forecast
 * @param {number} lat
 * @param {number} lng
 * @param {Function} [t] - translation function
 * @returns {Array} Array of daily forecast objects
 */
export async function getForecast(lat, lng, t) {
  const url = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Forecast API error: ${response.status}`);
  const data = await response.json();

  return data.daily.time.map((date, i) => {
    const info = getWeatherInfo(data.daily.weather_code[i], t);
    return {
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
      windspeed: data.daily.wind_speed_10m_max[i],
      weatherCode: data.daily.weather_code[i],
      description: info.desc,
      isSevere: info.severity !== null,
      severity: info.severity,
    };
  });
}

/**
 * Detect severe weather alerts from current + forecast data
 * @param {number} lat
 * @param {number} lng
 * @param {Function} [t] - translation function
 * @returns {Array} Array of alert objects compatible with existing alert format
 */
export async function getWeatherAlerts(lat, lng, t) {
  try {
    const tr = (key, fallback) => (t ? t(key) : fallback);
    const [current, forecast] = await Promise.all([
      getCurrentWeather(lat, lng, t),
      getForecast(lat, lng, t),
    ]);

    const alerts = [];
    const now = new Date().toISOString();

    // Check current conditions
    if (current.isSevere) {
      alerts.push({
        id: `weather-current-${current.weatherCode}`,
        type: classifyWeatherType(current.weatherCode),
        severity: current.severity,
        title: `${tr('weather.currentPrefix', 'Current:')} ${current.description}`,
        description: `${tr('weather.currentDesc', 'Current weather conditions:')} ${current.description}. ${tr('weather.temperature', 'Temperature:')} ${current.temperature}°C, ${tr('weather.wind', 'Wind:')} ${current.windspeed} km/h, ${tr('weather.humidity', 'Humidity:')} ${current.humidity}%.`,
        verified: true,
        source: 'Open-Meteo (Official)',
        timestamp: now,
        location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        isWeather: true,
        isOfficial: true,
        recommendation: getWeatherRecommendation(current.weatherCode, t),
        expires: new Date(Date.now() + 3600000).toISOString(),
      });
    }

    // Check forecast for severe conditions in next 48 hours
    const next48 = forecast.slice(0, 2);
    for (const day of next48) {
      if (day.isSevere) {
        const type = classifyWeatherType(day.weatherCode);
        // Avoid duplicate with current if same type
        const alreadyExists = alerts.some(a => a.type === type && a.title.includes(day.description));
        if (!alreadyExists) {
          alerts.push({
            id: `weather-forecast-${day.date}-${day.weatherCode}`,
            type,
            severity: day.severity,
            title: `${tr('weather.forecastPrefix', 'Forecast:')} ${day.description} (${new Date(day.date).toLocaleDateString()})`,
            description: `${day.description} ${tr('weather.expectedOn', 'expected on')} ${new Date(day.date).toLocaleDateString()}. ${tr('weather.high', 'High:')} ${day.tempMax}°C, ${tr('weather.low', 'Low:')} ${day.tempMin}°C. ${tr('weather.precipitation', 'Precipitation:')} ${day.precipitation}mm (${day.precipitationProbability}% ${tr('weather.chance', 'chance')}). ${tr('weather.maxWind', 'Max wind:')} ${day.windspeed} km/h.`,
            verified: true,
            source: 'Open-Meteo (Official)',
            timestamp: now,
            location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            isWeather: true,
            isOfficial: true,
            recommendation: getWeatherRecommendation(day.weatherCode, t),
            expires: new Date(day.date + 'T23:59:59').toISOString(),
          });
        }
      }

      // Check for heavy rain / flood risk
      if (day.precipitation > 30 || (day.precipitationProbability > 80 && day.precipitation > 15)) {
        alerts.push({
          id: `weather-flood-${day.date}`,
          type: 'flood',
          severity: day.precipitation > 50 ? 'high' : 'medium',
          title: `${tr('weather.floodRiskPrefix', 'Flood Risk:')} ${tr('weather.heavyPrecip', 'Heavy precipitation expected')} (${new Date(day.date).toLocaleDateString()})`,
          description: `${day.precipitation}mm ${tr('weather.precipitation', 'Precipitation:').toLowerCase()} ${day.precipitationProbability}% ${tr('weather.chance', 'chance')}. ${tr('weather.floodDesc', 'Potential for water accumulation and urban flooding in low-lying areas.')}`,
          verified: true,
          source: 'Open-Meteo (Official)',
          timestamp: now,
          location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          isWeather: true,
          isOfficial: true,
          recommendation: tr('weather.floodRec', 'Avoid low-lying areas. Keep emergency supplies ready. Do not drive through flooded roads.'),
          expires: new Date(day.date + 'T23:59:59').toISOString(),
        });
      }
    }

    return alerts;
  } catch (err) {
    console.error('Weather alerts error:', err);
    return [];
  }
}

function classifyWeatherType(code) {
  if (code >= 95) return 'thunderstorm';
  if (code >= 80 && code <= 82) return 'weather';
  if ((code >= 61 && code <= 67) || (code >= 55 && code <= 57)) return 'weather';
  if (code >= 71 && code <= 86) return 'weather';
  if (code >= 45 && code <= 48) return 'weather';
  return 'weather';
}

function getWeatherRecommendation(code, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  if (code === 99) return tr('weather.rec99', 'Seek shelter immediately. Stay away from windows. Avoid outdoor activities.');
  if (code >= 95) return tr('weather.rec95', 'Avoid outdoor activities. Stay indoors. Keep away from tall structures and trees.');
  if (code === 82) return tr('weather.rec82', 'Carry rain gear. Watch for flash flooding. Avoid low-lying areas.');
  if (code === 67) return tr('weather.rec67', 'Avoid travel if possible. Watch for ice on roads. Power outages possible.');
  if (code === 65) return tr('weather.rec65', 'Carry rain gear. Watch for localized flooding.');
  if (code === 66) return tr('weather.rec66', 'Watch for icy conditions. Drive carefully.');
  if (code >= 55) return tr('weather.rec55', 'Carry an umbrella. Roads may be slippery.');
  return tr('weather.recDefault', 'Stay informed about changing weather conditions.');
}

async function getPremiumCurrentWeather(lat, lng, t) {
  const url = `${OPENWEATHER_API_URL}/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Premium weather API error: ${response.status}`);
  const data = await response.json();

  return {
    temperature: data.main.temp,
    windspeed: data.wind.speed * 3.6, // m/s to km/h
    humidity: data.main.humidity,
    precipitation: data.rain?.['1h'] || 0,
    weatherCode: data.weather[0].id,
    description: data.weather[0].description,
    isSevere: data.weather[0].id < 300 || data.weather[0].id >= 500,
    severity: data.weather[0].id >= 500 ? 'medium' : null,
    source: 'OpenWeatherMap',
    timestamp: new Date().toISOString(),
  };
}
