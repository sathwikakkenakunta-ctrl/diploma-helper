const ALLOWED_ORIGIN = 'https://diploma-helper.vercel.app';
const SBTET_ENDPOINT = 'https://www.sbtet.telangana.gov.in/api/api/PreExamination/getAttendanceReport';
const PIN_PATTERN = /^\d{5}-[A-Za-z0-9]{2,8}-\d{3}$/;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_TRACKED_CLIENTS = 5_000;
const requestBuckets = new Map();

// Best-effort abuse protection without KV, Durable Objects, or a dashboard binding.
// Worker isolates are intentionally short-lived, so this is not an accounting system.
function isRateLimited(ip) {
  const now = Date.now();
  if (requestBuckets.size >= MAX_TRACKED_CLIENTS && !requestBuckets.has(ip)) {
    const oldest = [...requestBuckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)[0]?.[0];
    if (oldest) requestBuckets.delete(oldest);
  }

  const bucket = requestBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    requestBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin !== ALLOWED_ORIGIN) delete headers['Access-Control-Allow-Origin'];
  return headers;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
    },
  });
}

function requestId() {
  return crypto.randomUUID();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin);

    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: 'Origin not allowed.' }, 403, origin);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'GET') {
      return json({ error: 'Only GET requests are supported.' }, 405, origin);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/') {
      return json({ error: 'Not found.' }, 404, origin);
    }

    const pin = (url.searchParams.get('pin') || '').trim().toUpperCase();
    if (!PIN_PATTERN.test(pin)) {
      return json({ error: 'Invalid PIN format. Use 26161-CS-014.' }, 400, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip)) {
      return json({ error: 'Too many requests. Try again in a minute.' }, 429, origin);
    }

    const upstreamUrl = new URL(SBTET_ENDPOINT);
    upstreamUrl.searchParams.set('Pin', pin);

    const id = requestId();

    try {
      const upstream = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      const text = await upstream.text();
      if (!upstream.ok) {
        console.error('SBTET upstream returned a non-2xx response', { requestId: id, status: upstream.status });
        return json({ error: 'SBTET attendance service returned an error.', upstreamStatus: upstream.status, requestId: id }, 502, origin);
      }

      let data;
      try {
        data = JSON.parse(text);
        if (typeof data === 'string') data = JSON.parse(data);
      } catch {
        console.error('SBTET upstream returned invalid JSON', { requestId: id, status: upstream.status });
        return json({ error: 'SBTET returned an invalid response.', requestId: id }, 502, origin);
      }

      return json(data, 200, origin);
    } catch (error) {
      console.error('SBTET request failed', { requestId: id, error: error instanceof Error ? error.message : String(error) });
      return json({ error: 'Attendance service is temporarily unavailable.', requestId: id }, 502, origin);
    }
  },
};
