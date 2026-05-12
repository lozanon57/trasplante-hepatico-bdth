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
    document.body.appendChild(input);

    let settled = false;
    const settle = (file: File | null) => {
      if (settled) return;
      settled = true;
      document.body.removeChild(input);
      resolve(file);
    };

    input.addEventListener('change', () => {
      settle(input.files?.[0] ?? null);
    });
    // Some browsers fire 'cancel' when the dialog is closed without a selection
    input.addEventListener('cancel', () => settle(null));
    // Fallback: if focus returns to window without a change event (old browsers)
    window.addEventListener('focus', function onFocus() {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => settle(null), 500);
    });

    input.click();
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

/** Crop top 22% of image via Canvas to remove patient name/NHC header. */
function cropHeaderCanvas(
  base64: string,
  mimeType: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) { reject(new Error('Dimensiones desconocidas')); return; }
      const cropTop = Math.round(h * 0.22);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h - cropTop;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas no disponible')); return; }
      ctx.drawImage(img, 0, cropTop, w, h - cropTop, 0, 0, w, h - cropTop);
      const out = canvas.toDataURL('image/jpeg', 0.88);
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
    headerRedacted = true;
  } catch {
    // proceed with unredacted image
  }

  const options = await readOcrOptions();
  const safeMime = mimeType.startsWith('image/') ? mimeType as 'image/jpeg' | 'image/png' : 'image/jpeg';
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
