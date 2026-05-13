/**
 * Vercel Edge Function — BDTH OCR Proxy
 * Calls api.anthropic.com from the server to avoid browser CORS restrictions.
 * The API key lives as a Vercel secret, never in the browser bundle.
 */
export const config = { runtime: 'edge' };

const ANTHROPIC_URL  = 'https://api.anthropic.com/v1/messages';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  let body;
  try {
    body = await request.text();
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body,
  });

  const data = await upstream.text();
  return new Response(data, {
    status:  upstream.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
