import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../api/client';

const KEY_LAST_SYNC = 'bdth_last_sync';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export async function getLastSync(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEY_LAST_SYNC);
  return v ? parseInt(v, 10) : 0;
}

async function setLastSync(ts: number) {
  await SecureStore.setItemAsync(KEY_LAST_SYNC, ts.toString());
}

// Sube cambios locales pendientes al servidor
export async function pushPending(pendingItems: {
  trasplantes?: unknown[];
  formularios?: { donante?: unknown[]; implante?: unknown[]; postoperatorio?: unknown[] };
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch('/sync/push', {
      method: 'POST',
      body: JSON.stringify(pendingItems),
    });
    if (!res.ok) return { ok: false, error: 'Error del servidor' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sin conexión' };
  }
}

// Descarga cambios del servidor desde la última sync
export async function pullChanges(): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const since = await getLastSync();
    const res   = await apiFetch(`/sync/pull?since=${since}`);
    if (!res.ok) return { ok: false, error: 'Error del servidor' };
    const data = await res.json();
    await setLastSync(data.server_time ?? Date.now());
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Sin conexión' };
  }
}
