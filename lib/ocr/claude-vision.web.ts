// Web stub — OCR disabled without Anthropic API key
// Shows demo message instead of calling the API

export interface OCROptions {
  offlineMode?: boolean;
  ocrServerUrl?: string;
}

export async function extractFromImage(
  _base64Image: string,
  _mediaType: string,
  seccion: string,
  _options: OCROptions = {}
): Promise<Record<string, unknown>> {
  throw new Error(
    `OCR no disponible en la demo web.\n\nPara usar el OCR completo (Claude Vision + Tesseract offline), instala la app en iOS/Android con Expo Go escaneando el QR desde el repositorio.`
  );
}

export function parseFechaFormulario(fecha: string | null): number | null {
  if (!fecha) return null;
  const match = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`).getTime();
}

export function formatFecha(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
