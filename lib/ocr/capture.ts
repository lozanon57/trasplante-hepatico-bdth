import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { cropHeader } from './redact';
import { extractFromImage, parseFechaFormulario, type OCROptions } from './claude-vision';

/** Convert a Blob to a raw base64 string (no data URI prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Crop top 22% of image in the browser using Canvas (removes patient name/NHC header). */
async function cropHeaderWeb(base64: string, hintW: number, hintH: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Use actual rendered dimensions; fall back to hints if zero
      const width  = img.naturalWidth  || hintW;
      const height = img.naturalHeight || hintH;
      if (!width || !height) { reject(new Error('Cannot determine image dimensions')); return; }
      const cropTop = Math.round(height * 0.22);
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height - cropTop;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      ctx.drawImage(img, 0, cropTop, width, height - cropTop, 0, 0, width, height - cropTop);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ''));
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

export type OcrSource = 'camera' | 'gallery';
export type OcrSeccion = 'donante' | 'receptor_implante' | 'postoperatorio';

export interface CaptureResult {
  fields: Record<string, unknown>;
  /** True when the patient header was successfully cropped before sending */
  headerRedacted: boolean;
  fieldCount: number;
}

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

/**
 * Full OCR pipeline:
 *   1. Launch camera or gallery picker
 *   2. Crop top 22% of image (patient name / NHC header) — native only
 *   3. Read offline/server settings from SecureStore
 *   4. Send to Claude Vision API or local OCR server
 *   5. Return parsed fields + metadata
 *
 * Returns null if the user cancelled or permissions were denied.
 */
export async function captureAndOCR(
  source: OcrSource,
  seccion: OcrSeccion,
): Promise<CaptureResult | null> {
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
  let base64: string;
  let headerRedacted = false;

  // expo-image-picker on web may return a blob URI without base64 data
  if (asset.base64) {
    // Strip data URI prefix if present (some web environments include it)
    base64 = asset.base64.startsWith('data:')
      ? asset.base64.split(',')[1] ?? asset.base64
      : asset.base64;
  } else if ((Platform.OS as string) === 'web' && asset.uri) {
    // Fallback: fetch the blob URI and convert to base64
    try {
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      base64 = await blobToBase64(blob);
    } catch {
      Alert.alert('Error', 'No se pudo leer la imagen seleccionada. Inténtalo de nuevo.');
      return null;
    }
  } else {
    Alert.alert('Error', 'La imagen no contiene datos de imagen válidos.');
    return null;
  }

  if ((Platform.OS as string) === 'web') {
    // Crop top 22% using Canvas API to redact patient name/NHC header
    // Use reported dimensions; if missing, cropHeaderWeb will read them from the image itself
    try {
      base64 = await cropHeaderWeb(base64, asset.width ?? 0, asset.height ?? 0);
      headerRedacted = true;
    } catch {
      // Non-fatal — proceed with unredacted image
    }
  } else if ((Platform.OS as string) !== 'web' && asset.uri && asset.width && asset.height) {
    // Native crop via expo-image-manipulator
    try {
      const cropped = await cropHeader(asset.uri, asset.width, asset.height);
      base64 = cropped.base64;
      headerRedacted = true;
    } catch {
      // Non-fatal
    }
  }

  const options = await readOcrOptions();
  const fields = await extractFromImage(base64, 'image/jpeg', seccion, options);
  const fieldCount = Object.values(fields).filter(v => v !== null).length;

  return { fields, fieldCount, headerRedacted };
}

export { parseFechaFormulario };
