const ALLOWED_ORIGIN = 'https://diploma-helper.vercel.app';
const SBTET_ENDPOINT = 'https://www.sbtet.telangana.gov.in/api/api/PreExamination/getAttendanceReport';
const PIN_PATTERN = /^\d{5}-[A-Za-z0-9]{2,8}-\d{3}$/;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_PIN_PER_WINDOW = 6;
const MAX_TRACKED_CLIENTS = 10_000;
const UPSTREAM_TIMEOUT_MS = 12_000;
const MAX_UPSTREAM_ATTEMPTS = 2;
const requestBuckets = new Map();

// Best-effort abuse protection without KV, Durable Objects, or a dashboard binding.
// Worker isolates are intentionally short-lived, so this is not an accounting system.
function isRateLimited(rateKey) {
  const now = Date.now();
  if (requestBuckets.size >= MAX_TRACKED_CLIENTS && !requestBuckets.has(ip)) {
    const oldest = [...requestBuckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)[0]?.[0];
    if (oldest) requestBuckets.delete(oldest);
  }

  const bucket = requestBuckets.get(rateKey);
  if (!bucket || now >= bucket.resetAt) {
    requestBuckets.set(rateKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_PIN_PER_WINDOW;
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function isRetryableUpstreamStatus(status) {
  return [408, 425, 500, 502, 503, 504, 522, 524, 525, 526].includes(status);
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
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

    if (request.method !== 'POST') {
      return json({ error: 'Only POST requests are supported.' }, 405, origin);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/') {
      return json({ error: 'Not found.' }, 404, origin);
    }

    let body;
    try {
      if (Number(request.headers.get('Content-Length') || 0) > 256) throw new Error('Request too large');
      body = await request.json();
    } catch {
      return json({ error: 'Invalid request body.' }, 400, origin);
    }

    const pin = (typeof body?.pin === 'string' ? body.pin : '').trim().toUpperCase();
    if (!PIN_PATTERN.test(pin)) {
      return json({ error: 'Invalid PIN format. Use 26161-CS-014.' }, 400, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    // Scope the limit to the requested PIN so students sharing one NAT address
    // do not throttle one another. The PIN is never logged or returned.
    if (isRateLimited(`${ip}:${pin}`)) {
      return json({ error: 'Too many requests. Try again in a minute.' }, 429, origin);
    }

    const upstreamUrl = new URL(SBTET_ENDPOINT);
    upstreamUrl.searchParams.set('Pin', pin);

    const id = requestId();

    try {
      let upstream;
      let lastError;
      for (let attempt = 1; attempt <= MAX_UPSTREAM_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
        try {
          upstream = await fetch(upstreamUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
            cf: { cacheTtl: 0, cacheEverything: false },
          });
        } catch (error) {
          lastError = error;
        } finally {
          clearTimeout(timeout);
        }

        const shouldRetry = attempt < MAX_UPSTREAM_ATTEMPTS &&
          (lastError || (upstream && isRetryableUpstreamStatus(upstream.status)));
        if (!shouldRetry) break;

        console.warn('Retrying transient SBTET upstream failure', {
          requestId: id,
          attempt,
          status: upstream?.status || null,
          error: lastError?.name || null,
        });
        await wait(250 * attempt);
        lastError = undefined;
      }

      if (lastError || !upstream) throw lastError || new Error('No upstream response');

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
