// Places service — finds real nearby emergency resources via Overpass API (OpenStreetMap)
// No API key required. Returns hospitals, police, fire stations, shelters, ambulance services.
// Calculates real distances using the Haversine formula and sorts nearest → farthest.

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

const DEFAULT_RADIUS = 5000; // 5 km
const EXPANDED_RADIUS = 15000; // 15 km

/**
 * Haversine distance between two lat/lng pairs in kilometers.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format distance for display.
 */
function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Build Overpass QL query for a given center + radius.
 * Searches for: hospitals, clinics, police, fire stations, shelters, ambulance stations.
 */
function buildOverpassQuery(lat, lng, radius) {
  return `[out:json][timeout:25];(
    node["amenity"="hospital"](around:${radius},${lat},${lng});
    node["amenity"="clinic"](around:${radius},${lat},${lng});
    node["amenity"="police"](around:${radius},${lat},${lng});
    node["amenity"="fire_station"](around:${radius},${lat},${lng});
    node["amenity"="shelter"](around:${radius},${lat},${lng});
    node["social_facility"~"."](around:${radius},${lat},${lng});
    node["emergency"="ambulance_station"](around:${radius},${lat},${lng});
    way["amenity"="hospital"](around:${radius},${lat},${lng});
    way["amenity"="clinic"](around:${radius},${lat},${lng});
    way["amenity"="police"](around:${radius},${lat},${lng});
    way["amenity"="fire_station"](around:${radius},${lat},${lng});
    way["amenity"="shelter"](around:${radius},${lat},${lng});
    way["emergency"="ambulance_station"](around:${radius},${lat},${lng});
    relation["amenity"="hospital"](around:${radius},${lat},${lng});
    relation["amenity"="police"](around:${radius},${lat},${lng});
    relation["amenity"="fire_station"](around:${radius},${lat},${lng});
  );out center;`;
}

/**
 * Classify an OSM element into one of our resource types.
 */
function classifyResource(tags) {
  if (!tags) return null;

  const amenity = tags.amenity;
  const emergency = tags.emergency;
  const socialFacility = tags.social_facility;

  if (amenity === 'hospital') return 'hospital';
  if (amenity === 'clinic') return 'hospital';
  if (amenity === 'police') return 'police';
  if (amenity === 'fire_station') return 'fire';
  if (emergency === 'ambulance_station') return 'ambulance';
  if (amenity === 'shelter') return 'shelter';
  if (socialFacility) return 'shelter';

  return null;
}

/**
 * Extract coordinates from an Overpass element.
 * Nodes have direct lat/lon. Ways/relations have a center field.
 */
function getCoords(element) {
  if (element.lat != null && element.lon != null) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

/**
 * Parse an Overpass API element into our resource format.
 */
function parseResource(element, userLat, userLng) {
  const coords = getCoords(element);
  if (!coords) return null;

  const type = classifyResource(element.tags);
  if (!type) return null;

  const tags = element.tags || {};
  const name = tags.name || tags['name:en'] || tags['name:ur'] || null;
  const distanceKm = haversineDistance(userLat, userLng, coords.lat, coords.lon);

  return {
    id: `osm-${element.type}-${element.id}`,
    name: name || generateFallbackName(type),
    type,
    lat: coords.lat,
    lng: coords.lon,
    phone: tags.phone || tags['contact:phone'] || null,
    address: tags['addr:full'] || tags['addr:street'] || tags['addr:city'] || null,
    distanceKm,
    distance: formatDistance(distanceKm),
    website: tags.website || tags['contact:website'] || null,
    operator: tags.operator || null,
  };
}

function generateFallbackName(type) {
  const names = {
    hospital: 'Medical Facility',
    police: 'Police Station',
    fire: 'Fire Station',
    shelter: 'Emergency Shelter',
    ambulance: 'Ambulance Service',
  };
  return names[type] || 'Emergency Resource';
}

/**
 * Deduplicate resources that are very close together (e.g., same campus).
 * Keeps the one with a real name over generic fallback names.
 */
function deduplicateResources(resources) {
  const seen = new Map();

  for (const r of resources) {
    // Create a proximity key — resources within ~100m of each other with same type
    const key = `${r.type}-${Math.round(r.lat * 1000)}-${Math.round(r.lng * 1000)}`;

    if (seen.has(key)) {
      const existing = seen.get(key);
      // Keep the one with a real name (not a fallback)
      if (r.name && !existing.name?.includes('Medical Facility') && !existing.name?.includes('Police Station')) {
        seen.set(key, r);
      }
    } else {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values());
}

/**
 * Fetch real nearby emergency resources from OpenStreetMap via Overpass API.
 *
 * @param {number} lat - User's current latitude
 * @param {number} lng - User's current longitude
 * @param {string} [typeFilter] - Optional type filter: 'hospital', 'police', 'fire', 'shelter', 'ambulance'
 * @returns {Object} { resources, expanded, totalFound }
 *   resources: sorted nearest → farthest with real distances
 *   expanded: true if search was expanded to wider radius
 *   totalFound: total number of results before filtering
 */
/**
 * Reverse geocode lat/lng to a human-readable city name using Nominatim (OpenStreetMap).
 * Returns a short address string like "Lahore, Pakistan" or "Islamabad".
 * Falls back to coordinates if the API is unavailable.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'LifeSentinelApp/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) throw new Error(`Nominatim ${resp.status}`);
    const data = await resp.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
    const country = addr.country || '';
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (addr.state) return addr.state;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (err) {
    console.warn('Reverse geocode failed:', err.message);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export async function fetchNearbyResources(lat, lng, typeFilter = null) {
  const query = buildOverpassQuery(lat, lng, DEFAULT_RADIUS);

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) {
    throw new Error(`Overpass API returned ${response.status}. Please try again.`);
  }

  const data = await response.json();
  let resources = (data.elements || [])
    .map(el => parseResource(el, lat, lng))
    .filter(Boolean);

  resources = deduplicateResources(resources);

  // Sort by distance (nearest first)
  resources.sort((a, b) => a.distanceKm - b.distanceKm);

  const totalFound = resources.length;
  let expanded = false;

  // If very few results, try expanded radius
  if (resources.length < 3) {
    const expandedQuery = buildOverpassQuery(lat, lng, EXPANDED_RADIUS);
    try {
      const expandedResponse = await fetch(OVERPASS_ENDPOINT, {
        method: 'POST',
        body: `data=${encodeURIComponent(expandedQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (expandedResponse.ok) {
        const expandedData = await expandedResponse.json();
        let expandedResources = (expandedData.elements || [])
          .map(el => parseResource(el, lat, lng))
          .filter(Boolean);

        expandedResources = deduplicateResources(expandedResources);
        expandedResources.sort((a, b) => a.distanceKm - b.distanceKm);

        if (expandedResources.length > resources.length) {
          resources = expandedResources;
          expanded = true;
        }
      }
    } catch (err) {
      console.warn('Expanded search failed:', err.message);
    }
  }

  // Apply type filter if specified
  if (typeFilter && typeFilter !== 'all') {
    resources = resources.filter(r => r.type === typeFilter);
  }

  return { resources, expanded, totalFound: resources.length };
}
