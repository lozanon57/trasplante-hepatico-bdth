import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS  = 'bdth_access_token';
const KEY_REFRESH = 'bdth_refresh_token';
const KEY_SERVER  = 'bdth_api_url';

export async function getServerUrl(): Promise<string> {
  const url = await SecureStore.getItemAsync(KEY_SERVER);
  return url ?? '';
}

export async function setServerUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_SERVER, url);
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.setItemAsync(KEY_REFRESH, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS);
}

async function refreshAccessToken(): Promise<string | null> {
  const base    = await getServerUrl();
  const refresh = await SecureStore.getItemAsync(KEY_REFRESH);
  if (!base || !refresh) return null;
  try {
    const res = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    const { access } = await res.json();
    await SecureStore.setItemAsync(KEY_ACCESS, access);
    return access;
  } catch {
    return null;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const base  = await getServerUrl();
  if (!base)  throw new Error('Servidor no configurado');

  let token = await getAccessToken();
  const doRequest = (t: string | null) =>
    fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers ?? {}),
      },
    });

  let res = await doRequest(token);
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) res = await doRequest(token);
  }
  return res;
}
