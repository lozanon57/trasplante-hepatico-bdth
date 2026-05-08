import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const SALT_KEY        = 'bdth_anon_salt';
const PIN_HASH_KEY    = 'bdth_pin_hash';
const PIN_ATTEMPTS_KEY= 'bdth_pin_attempts';
const PIN_LOCKOUT_KEY = 'bdth_pin_lockout';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS   = 60 * 60 * 1000; // 1 hora

// ─────────────────────────────────────────────
// SALT — único por instalación
// ─────────────────────────────────────────────
async function getSalt(): Promise<string> {
  let salt = await SecureStore.getItemAsync(SALT_KEY);
  if (!salt) {
    const random = await Crypto.getRandomBytesAsync(32);
    salt = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }
  return salt;
}

export async function saltExists(): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(SALT_KEY);
  return !!salt;
}

// ─────────────────────────────────────────────
// ANONIMIZACIÓN
// ─────────────────────────────────────────────
export async function anonimizarNHC(nhc: string): Promise<{
  codigo_anon: string;
  nhc_hash: string;
}> {
  const salt = await getSalt();
  const nhcTrim = nhc.trim();

  const nhc_hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nhcTrim
  );

  const codigo_raw = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nhcTrim + salt
  );

  return {
    codigo_anon: 'BDT-' + codigo_raw.slice(0, 8).toUpperCase(),
    nhc_hash,
  };
}

// ─────────────────────────────────────────────
// PIN MAESTRO
// ─────────────────────────────────────────────
export async function pinConfigurado(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return !!hash;
}

export async function configurarPIN(pin: string): Promise<void> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(PIN_LOCKOUT_KEY);
}

export async function verificarPIN(pin: string): Promise<{ ok: boolean; bloqueado?: boolean; intentosRestantes?: number }> {
  // Comprobar bloqueo
  const lockoutStr = await SecureStore.getItemAsync(PIN_LOCKOUT_KEY);
  if (lockoutStr) {
    const lockoutUntil = parseInt(lockoutStr, 10);
    if (Date.now() < lockoutUntil) {
      return { ok: false, bloqueado: true };
    }
    await SecureStore.deleteItemAsync(PIN_LOCKOUT_KEY);
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
  }

  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!storedHash) return { ok: false };

  const inputHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);

  if (inputHash === storedHash) {
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
    return { ok: true };
  }

  // Incrementar intentos fallidos
  const attemptsStr = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) + 1 : 1;

  if (attempts >= MAX_ATTEMPTS) {
    const lockUntil = Date.now() + LOCKOUT_MS;
    await SecureStore.setItemAsync(PIN_LOCKOUT_KEY, lockUntil.toString());
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
    return { ok: false, bloqueado: true };
  }

  await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, attempts.toString());
  return { ok: false, intentosRestantes: MAX_ATTEMPTS - attempts };
}

export async function tiempoBloqueoRestante(): Promise<number> {
  const lockoutStr = await SecureStore.getItemAsync(PIN_LOCKOUT_KEY);
  if (!lockoutStr) return 0;
  const remaining = parseInt(lockoutStr, 10) - Date.now();
  return Math.max(0, Math.ceil(remaining / 60000)); // minutos
}

// ─────────────────────────────────────────────
// BACKUP DEL SALT (export cifrado con PIN)
// ─────────────────────────────────────────────
export async function exportarSaltCifrado(pin: string): Promise<string> {
  const { ok } = await verificarPIN(pin);
  if (!ok) throw new Error('PIN incorrecto');
  const salt = await getSalt();
  // XOR simple con hash del PIN — suficiente para backup local
  const pinHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  const saltBytes = salt.match(/.{2}/g)!.map(h => parseInt(h, 16));
  const keyBytes  = pinHash.match(/.{2}/g)!.map(h => parseInt(h, 16));
  const encrypted = saltBytes.map((b, i) => (b ^ keyBytes[i % keyBytes.length]).toString(16).padStart(2, '0')).join('');
  return `BDTH-SALT-v1:${encrypted}`;
}

export async function importarSaltCifrado(payload: string, pin: string): Promise<void> {
  if (!payload.startsWith('BDTH-SALT-v1:')) throw new Error('Formato de backup inválido');
  const encrypted = payload.replace('BDTH-SALT-v1:', '');
  const pinHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  const encBytes = encrypted.match(/.{2}/g)!.map(h => parseInt(h, 16));
  const keyBytes  = pinHash.match(/.{2}/g)!.map(h => parseInt(h, 16));
  const salt = encBytes.map((b, i) => (b ^ keyBytes[i % keyBytes.length]).toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(SALT_KEY, salt);
}
