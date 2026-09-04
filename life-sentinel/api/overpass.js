// Vercel serverless function — proxies Overpass API requests.
// This avoids browser CORS restrictions when calling overpass-api.de from
// the deployed frontend (e.g. lifesentinel.vercel.app).

const DEFAULT_ENDPOINT = 'https://overpass-api.de/api/interpreter';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { query, endpoint = DEFAULT_ENDPOINT } = req.body || {};

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing Overpass query' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const overpassRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await overpassRes.text();

    // Forward Overpass response status and content type when available.
    res.status(overpassRes.status);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(text);
  } catch (err) {
    const message = err.name === 'AbortError' ? 'Overpass request timed out' : err.message;
    return res.status(502).json({ error: message });
  }
}
