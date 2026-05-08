// Web implementation using localStorage + window.crypto

const SALT_KEY   = 'bdth_salt';
const PIN_KEY    = 'bdth_pin_hash';
const LOCK_KEY   = 'bdth_lock';
const TRIES_KEY  = 'bdth_tries';
const MAX_TRIES  = 3;
const LOCK_MS    = 60 * 60 * 1000;

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSalt(): Promise<string> {
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    salt = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SALT_KEY, salt);
  }
  return salt;
}

export async function anonimizarNHC(nhc: string): Promise<{ codigo_anon: string; nhc_hash: string }> {
  const salt = await getSalt();
  const nhc_hash   = await sha256hex(nhc.trim());
  const raw_anon   = await sha256hex(nhc.trim() + salt);
  const codigo_anon = 'BDT-' + raw_anon.substring(0, 8).toUpperCase();
  return { codigo_anon, nhc_hash };
}

export async function configurarPIN(pin: string): Promise<void> {
  const hash = await sha256hex(pin);
  localStorage.setItem(PIN_KEY, hash);
  localStorage.removeItem(TRIES_KEY);
  localStorage.removeItem(LOCK_KEY);
}

export async function pinConfigurado(): Promise<boolean> {
  return !!localStorage.getItem(PIN_KEY);
}

export async function verificarPIN(pin: string): Promise<{ ok: boolean; bloqueado?: boolean; intentosRestantes?: number }> {
  const lockUntil = parseInt(localStorage.getItem(LOCK_KEY) || '0');
  if (Date.now() < lockUntil) return { ok: false, bloqueado: true };
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return { ok: false };
  const hash = await sha256hex(pin);
  if (hash === stored) {
    localStorage.removeItem(TRIES_KEY);
    return { ok: true };
  }
  const tries = parseInt(localStorage.getItem(TRIES_KEY) || '0') + 1;
  localStorage.setItem(TRIES_KEY, String(tries));
  if (tries >= MAX_TRIES) {
    localStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MS));
    localStorage.removeItem(TRIES_KEY);
    return { ok: false, bloqueado: true, intentosRestantes: 0 };
  }
  return { ok: false, intentosRestantes: MAX_TRIES - tries };
}

export async function tiempoBloqueoRestante(): Promise<number> {
  const lockUntil = parseInt(localStorage.getItem(LOCK_KEY) || '0');
  const remaining = lockUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

export async function exportarSaltCifrado(pin: string): Promise<string> {
  const salt = await getSalt();
  const key  = await sha256hex(pin);
  return btoa(JSON.stringify({ salt, key: key.substring(0, 8) }));
}

export async function importarSaltCifrado(payload: string, pin: string): Promise<boolean> {
  try {
    const { salt, key } = JSON.parse(atob(payload));
    const check = await sha256hex(pin);
    if (check.substring(0, 8) !== key) return false;
    localStorage.setItem(SALT_KEY, salt);
    return true;
  } catch { return false; }
}
