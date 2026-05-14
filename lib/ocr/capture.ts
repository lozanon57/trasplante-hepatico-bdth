import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { cropHeader } from './redact';
import { extractFromImage, parseFechaFormulario, type OCROptions } from './claude-vision';

export type OcrSource = 'camera' | 'gallery';
export type OcrSeccion = 'donante' | 'receptor_implante' | 'postoperatorio';

export interface CaptureResult {
  fields: Record<string, unknown>;
  headerRedacted: boolean;
  fieldCount: number;
}

// ── Web-only helpers ──────────────────────────────────────────────────────────

/** Open a native <input type="file"> and return the selected file, or null if cancelled. */
function pickFileWeb(useCamera: boolean): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.setAttribute('capture', 'environment');
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);

    let settled = false;
    const settle = (file: File | null) => {
      if (settled) return;
      settled = true;
      try { document.body.removeChild(input); } catch { /* already removed */ }
      resolve(file);
    };

    // Primary: file selected
    input.addEventListener('change', () => {
      settle(input.files?.[0] ?? null);
    });

    // Chrome 113+/Safari 15.4+: dialog cancelled without selection
    input.addEventListener('cancel', () => settle(null));

    // Last-resort: resolve after 5 minutes so the promise never hangs forever.
    // NOTE: We deliberately DO NOT use window 'focus' or 'blur' events because
    // many browsers fire 'focus' when the file dialog *opens*, not when it closes,
    // which would cancel the picker 500 ms after the user clicks the button.
    const giveUpTimer = setTimeout(() => settle(null), 5 * 60 * 1000);

    // Clean up timer if settled early
    const origSettle = settle;
    // Override already captured — timer is cleaned when promise resolves
    void giveUpTimer; // keep reference alive; clearTimeout called implicitly via GC is fine

    input.click();

    // Fallback for browsers that neither fire 'change' on cancel nor support 'cancel':
    // listen for document-level pointer events after a delay to detect dialog close.
    const pointerFallback = () => {
      document.removeEventListener('pointerdown', pointerFallback);
      document.removeEventListener('keydown', pointerFallback);
      setTimeout(() => origSettle(null), 300);
    };
    setTimeout(() => {
      if (!settled) {
        document.addEventListener('pointerdown', pointerFallback, { once: true });
        document.addEventListener('keydown', pointerFallback, { once: true });
      }
    }, 1000); // only activate after 1s so user has time to interact with dialog
  });
}

/** Read a File as raw base64 (no data URI prefix). */
function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, data] = dataUrl.split(',');
      if (!data) { reject(new Error('FileReader returned empty data')); return; }
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      resolve({ base64: data, mimeType });
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Crop top 22% of image (removes patient name/NHC header) and resize so the
 * longest dimension is at most MAX_DIM pixels.
 *
 * Limiting size keeps the base64 payload well under Vercel's 4.5 MB Edge limit
 * and speeds up Claude Vision processing without losing OCR accuracy.
 */
const MAX_DIM = 1500;

function cropHeaderCanvas(
  base64: string,
  mimeType: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      if (!origW || !origH) { reject(new Error('Dimensiones desconocidas')); return; }

      // Remove top 22 %
      const cropTop = Math.round(origH * 0.22);
      const croppedH = origH - cropTop;

      // Scale down if any dimension exceeds MAX_DIM
      const scale = Math.min(1, MAX_DIM / Math.max(origW, croppedH));
      const outW = Math.round(origW * scale);
      const outH = Math.round(croppedH * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas no disponible')); return; }

      // Draw cropped + scaled image
      ctx.drawImage(img, 0, cropTop, origW, croppedH, 0, 0, outW, outH);
      const out = canvas.toDataURL('image/jpeg', 0.85);
      resolve(out.split(',')[1]);
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para el recorte'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

// ── Web OCR entry point ───────────────────────────────────────────────────────

async function captureAndOCRWeb(
  source: OcrSource,
  seccion: OcrSeccion,
): Promise<CaptureResult | null> {
  const file = await pickFileWeb(source === 'camera');
  if (!file) return null;

  let { base64, mimeType } = await fileToBase64(file);

  // Crop header (non-fatal)
  let headerRedacted = false;
  try {
    base64 = await cropHeaderCanvas(base64, mimeType);
    // Canvas always outputs JPEG regardless of input format (HEIC, PNG, WebP, BMP…).
    // Update mimeType so Anthropic receives the correct media_type declaration.
    mimeType = 'image/jpeg';
    headerRedacted = true;
  } catch {
    // Non-fatal: proceed with original image.
    // Still sanitize: Anthropic only supports jpeg/png/gif/webp.
    if (!['image/jpeg','image/png','image/gif','image/webp'].includes(mimeType)) {
      mimeType = 'image/jpeg';
    }
  }

  const options = await readOcrOptions();
  const safeMime = mimeType as 'image/jpeg' | 'image/png';
  const fields   = await extractFromImage(base64, safeMime, seccion, options);
  const fieldCount = Object.values(fields).filter(v => v !== null).length;

  return { fields, fieldCount, headerRedacted };
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function readOcrOptions(): Promise<OCROptions> {
  const [offline, serverIp] = await Promise.all([
    SecureStore.getItemAsync('bdth_offline_mode'),
    SecureStore.getItemAsync('bdth_ocr_server_ip'),
  ]);
  return {
    offlineMode: offline === '1',
    ocrServerUrl: serverIp
      ? (serverIp.startsWith('http') ? serverIp : `http://${serverIp}`)
      : undefined,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function captureAndOCR(
  source: OcrSource,
  seccion: OcrSeccion,
): Promise<CaptureResult | null> {
  // Web: use native file input directly (more reliable than expo-image-picker on web)
  if ((Platform.OS as string) === 'web') {
    return captureAndOCRWeb(source, seccion);
  }

  // Native: use expo-image-picker
  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permiso denegado', 'Activa el acceso a la cámara en Ajustes.');
      return null;
    }
  }

  const pickerResult = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.88 })
    : await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.88,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

  if (pickerResult.canceled || !pickerResult.assets?.[0]) return null;

  const asset = pickerResult.assets[0];
  if (!asset.base64 || !asset.uri || !asset.width || !asset.height) return null;

  let base64 = asset.base64;
  let headerRedacted = false;

  try {
    const cropped = await cropHeader(asset.uri, asset.width, asset.height);
    base64 = cropped.base64;
    headerRedacted = true;
  } catch {
    // Non-fatal
  }

  const options   = await readOcrOptions();
  const fields    = await extractFromImage(base64, 'image/jpeg', seccion, options);
  const fieldCount = Object.values(fields).filter(v => v !== null).length;

  return { fields, fieldCount, headerRedacted };
}

export { parseFechaFormulario };
