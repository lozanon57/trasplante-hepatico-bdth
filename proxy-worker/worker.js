/**
 * BDTH OCR Proxy — Cloudflare Worker
 * Proxies requests to api.anthropic.com/v1/messages adding CORS headers.
 *
 * Setup:
 *   1. Workers & Pages → Create application → Create Worker
 *   2. Paste this code → Deploy
 *   3. Settings → Variables and Secrets → Add ANTHROPIC_API_KEY (secret)
 *   4. Copy the Worker URL and set EXPO_PUBLIC_OCR_PROXY_URL in the app
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, anthropic-version',
  'Access-Control-Max-Age':       '86400',
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.text();
    return new Response(data, {
      status:  upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  },
};
