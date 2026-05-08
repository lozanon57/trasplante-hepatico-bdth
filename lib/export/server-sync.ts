import * as FileSystem from 'expo-file-system';

export interface SyncResult {
  ok: boolean;
  filename?: string;
  size?: number;
  error?: string;
}

export async function uploadToServer(filePath: string, serverIP: string): Promise<SyncResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filename = filePath.split('/').pop() ?? 'BDTH_export.xlsx';
    const url = `http://${serverIP}:3001/upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: base64, filename }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { ok: boolean; filename: string; size: number };
    return data;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function checkServerStatus(serverIP: string): Promise<{ online: boolean; lastFile?: string }> {
  try {
    const res = await fetch(`http://${serverIP}:3001/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false };
    const data = await res.json() as { ok: boolean; last: string | null };
    return { online: data.ok, lastFile: data.last ?? undefined };
  } catch {
    return { online: false };
  }
}
