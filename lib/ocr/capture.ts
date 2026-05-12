import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { cropHeader } from './redact';
import { extractFromImage, parseFechaFormulario, type OCROptions } from './claude-vision';

/** Crop top 22% of image in the browser using Canvas (removes patient name/NHC header). */
async function cropHeaderWeb(base64: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cropTop = Math.round(height * 0.22);
      const canvas = document.createElement('canvas');
      canvas.width = width;
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

  if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) return null;

  const asset = pickerResult.assets[0];
  let base64 = asset.base64!;
  let headerRedacted = false;

  if (Platform.OS === 'web' && asset.width && asset.height) {
    // Crop top 22% using Canvas API to redact patient name/NHC header
    try {
      base64 = await cropHeaderWeb(base64, asset.width, asset.height);
      headerRedacted = true;
    } catch {
      // Non-fatal
    }
  } else if (Platform.OS !== 'web' && asset.uri && asset.width && asset.height) {
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
