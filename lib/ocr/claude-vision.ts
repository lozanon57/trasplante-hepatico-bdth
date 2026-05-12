import Anthropic from '@anthropic-ai/sdk';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type Seccion = 'donante' | 'receptor_implante' | 'postoperatorio';

// Maps the seccion key used by the app to the key expected by the Python OCR server
const SECCION_MAP: Record<Seccion, string> = {
  donante: 'donante',
  receptor_implante: 'implante',
  postoperatorio: 'postoperatorio',
};

const SYSTEM_PROMPT = `Eres un experto en extracción de datos de formularios médicos de trasplante hepático del Hospital Gregorio Marañón (formulario BDTH).

REGLAS CRÍTICAS:
1. Lee TANTO texto impreso como ESCRITURA MANUSCRITA en español
2. Los valores escritos a mano suelen estar en los espacios en blanco del formulario
3. Devuelve ÚNICAMENTE JSON válido, sin markdown ni texto adicional
4. Si un campo no es legible o está vacío, devuelve null (no inventes datos)
5. Campos binarios: 0=No, 1=Sí
6. Fechas: formato "DD/MM/YYYY"
7. Tiempos: en minutos (real) salvo que el campo especifique segundos
8. Para campos con opciones "0 X / 1 Y / 2 Z": devuelve el número entero
9. Los valores manuscritos tienen la misma validez que los impresos
10. NO incluyas comillas en valores numéricos — devuelve número, no string`;

const PROMPT_DONANTE = `Extrae del formulario BDTH página 1 (DONANTE) los siguientes campos.
Presta especial atención a valores escritos a mano en los espacios en blanco.

Devuelve JSON con exactamente estas claves:
{
  "fecha": "DD/MM/YYYY o null",
  "nhc_higado": "texto o null",
  "grupo_abo": "A/B/AB/O o null",
  "sexo": 0 o 1,
  "edad": número, "peso_kg": número, "talla_cm": número,
  "causa_muerte": "PCR/ACV/TCE/Otro",
  "causa_uci": "texto",
  "fr_hta": 0|1, "fr_dm": 0|1, "fr_dl": 0|1, "oh": 0|1, "tabaco": 0|1,
  "drogas_va": 0|1, "pcr_previa": 0|1,
  "eco_tc": 0|1|2|3,
  "as_na": número, "as_alt": número, "as_ast": número, "as_plaq": número,
  "as_ggt": número, "as_bi": número, "as_cr": número,
  "tipo_donacion": "DBD/DCD/DCD+ECMO/DCD_PAM",
  "donacion_rinon": 0|1, "donacion_corazon": 0|1, "donacion_pulmon": 0|1,
  "dcd_tiempo_ecmo_min": número, "twit_seg": número, "fwit_seg": número,
  "esteatosis_macros": 0|1, "perfusion": 0|1|2,
  "anomalias_arteriales": 0|1, "tipo_anomalia": "texto",
  "tipo_reconstruccion": "texto", "biopsia": 0|1,
  "solucion_preservacion": "texto",
  "sangre_basal_ph": número, "sangre_1h_ph": número, "sangre_1h30_ph": número, "sangre_2h_ph": número,
  "sangre_basal_lact": número, "sangre_1h_lact": número, "sangre_1h30_lact": número, "sangre_2h_lact": número,
  "sangre_basal_alt": número, "sangre_1h_alt": número, "sangre_1h30_alt": número, "sangre_2h_alt": número,
  "sangre_basal_ast": número, "sangre_1h_ast": número, "sangre_1h30_ast": número, "sangre_2h_ast": número,
  "sangre_basal_ggt": número, "sangre_1h_ggt": número, "sangre_1h30_ggt": número, "sangre_2h_ggt": número,
  "sangre_basal_bi": número, "sangre_1h_bi": número, "sangre_1h30_bi": número, "sangre_2h_bi": número,
  "sangre_basal_inr": número, "sangre_1h_inr": número, "sangre_1h30_inr": número, "sangre_2h_inr": número,
  "sangre_basal_bnp": número, "sangre_1h_bnp": número,
  "sangre_basal_trop": número, "sangre_1h_trop": número,
  "bilis_2h_ph": número, "bilis_2h_bicarb": número, "bilis_2h_lact": número,
  "bilis_2h_alt": número, "bilis_2h_ggt": número, "bilis_2h_bi": número,
  "bilis_2h_ast": número, "bilis_2h_glu": número, "bilis_2h_inr": número,
  "organos_hora_inicio": "HH:MM", "organos_hora_fin": "HH:MM",
  "organos_tiempo_min": número, "organos_causa": "texto",
  "organos_validez": 0|1,
  "preservacion": "SCS/SCS+HOPE/SCS+Organox"
}`;

const PROMPT_IMPLANTE = `Extrae del formulario BDTH página 2 (RECEPTOR + IMPLANTE + HOPE).
Presta especial atención a valores manuscritos en los campos de tiempo y analíticas.

Devuelve JSON con exactamente estas claves:
{
  "nhc_receptor": "texto",
  "sexo": 0|1, "edad": número, "peso_kg": número, "talla_cm": número,
  "origen_hepatopatia": "OH/VHC/VHB/NASH/CBP/CEP/Autoinmune/Otros",
  "chc": 0|1,
  "fr_hta": 0|1, "fr_dm": 0|1, "fr_dl": 0|1, "tabaco": 0|1, "oh": 0|1,
  "meld": número,
  "as_alt": número, "as_ast": número, "as_cr": número,
  "as_plaq": número, "as_ggt": número, "as_inr": número, "as_bi": número,
  "alerta_cero": 0|1,
  "tecnica": 0|1,
  "reperfusion": 0|1|2,
  "sindrome_reperfusion": 0|1|2|3,
  "vb_tecnica": 0|1,
  "peso_injerto": número, "flujo_portal": número, "flujo_arterial": número,
  "t_isquemia_fria": número, "t_preservacion_hope": número,
  "t_isquemia_caliente": número, "t_isquemia_total": número,
  "retho": 0|1, "pdr": número,
  "hope_hora_inicio": "HH:MM", "hope_hora_fin": "HH:MM",
  "hope_tiempo_min": número,
  "hope_causa": "DCD/Logística_THO/Logística_receptor/Otros",
  "hope_tipo": 0|1,
  "hope_flujo": número, "hope_presion": número, "hope_po2": número,
  "serie_intraop": [
    { "timepoint": "BASAL", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+1H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+2H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+3H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+4H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+5H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+6H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+7H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "+8H", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null },
    { "timepoint": "FIN", "produc": null, "bilis": null, "flujo_arteria": null, "flujo_porta": null, "correc": null, "bicarb": null, "aspect_higado": null }
  ]
}`;

const PROMPT_POSTOP = `Extrae del formulario BDTH página 3 (POSTOPERATORIO + SEGUIMIENTO).
Incluye tanto valores impresos como escritos a mano (fechas, valores analíticos).

Devuelve JSON con exactamente estas claves:
{
  "pico_alt": número, "pico_ast": número, "pico_ggt": número,
  "pico_inr": número, "pico_cr": número, "pico_plaq": número, "pico_bi": número,
  "disfuncion_olthoff_7dpo": 0|1,
  "bi_mayor_10": 0|1, "inr_mayor_16": 0|1, "alt_ast_mayor_2000": 0|1,
  "serie_dpo": [
    { "dia": 1, "bi": null, "inr": null, "alt": null, "ast": null, "ggt": null, "fa": null, "crea": null },
    { "dia": 2, "bi": null, "inr": null, "alt": null, "ast": null, "ggt": null, "fa": null, "crea": null },
    { "dia": 3, "bi": null, "inr": null, "alt": null, "ast": null, "ggt": null, "fa": null, "crea": null },
    { "dia": 4, "bi": null, "inr": null, "alt": null, "ast": null, "ggt": null, "fa": null, "crea": null },
    { "dia": 5, "bi": null, "inr": null, "alt": null, "ast": null, "ggt": null, "fa": null, "crea": null },
    { "dia": 6, "bi": null, "inr": null, "alt": null, "ast": null, "ggt": null, "fa": null, "crea": null },
    { "dia": 7, "bi": null, "inr": null, "alt": null, "ast": null, "ggt": null, "fa": null, "crea": null }
  ],
  "sangrado": 0|1, "reintervencion": 0|1,
  "reintervencion_fecha": "DD/MM/YYYY", "reintervencion_causa": "texto",
  "fecha_alta": "DD/MM/YYYY",
  "dias_estancia_total": número, "dias_estancia_rea": número,
  "complicaciones_po": 0|1, "clavien_dindo": 0|1|2|3|4|5|6,
  "ead_olthoff": 0|1, "pnf": 0|1, "trombosis_arterial": 0|1,
  "complicacion_biliar": 0|1, "estenosis_biliar_no_anast": 0|1,
  "fuga_biliar": 0|1, "rechazo_agudo": 0|1,
  "fecha_ultima_revision": "DD/MM/YYYY",
  "exitus_global": 0|1,
  "exitus_7d": 0|1, "exitus_7d_fecha": "DD/MM/YYYY", "exitus_7d_causa": "texto",
  "exitus_30d": 0|1, "exitus_30d_fecha": "DD/MM/YYYY", "exitus_30d_causa": "texto",
  "perdida_injerto": 0|1, "perdida_injerto_fecha": "DD/MM/YYYY", "causa_perdida_injerto": "texto",
  "retrasplante": 0|1, "retrasplante_fecha": "DD/MM/YYYY", "causa_retrasplante": "texto",
  "rm_6meses": 0|1,
  "colangiopatia_intrahepatica": 0|1, "colangiopatia_intrahepatica_fecha": "DD/MM/YYYY",
  "colangiopatia_intrahepatica_desc": "texto",
  "colangiopatia": 0|1, "colangiopatia_fecha": "DD/MM/YYYY", "colangiopatia_desc": "texto",
  "estenosis_anastomosis": 0|1, "estenosis_anastomosis_fecha": "DD/MM/YYYY",
  "estenosis_anastomosis_desc": "texto"
}`;

const PROMPTS: Record<Seccion, string> = {
  donante: PROMPT_DONANTE,
  receptor_implante: PROMPT_IMPLANTE,
  postoperatorio: PROMPT_POSTOP,
};

// ── API key helpers ────────────────────────────────────────────────────────────

/**
 * Get the stored API key, or (web only) prompt the user to enter it inline.
 * On native, throws if the key is not configured.
 */
async function getOrPromptApiKey(): Promise<string> {
  const stored = await SecureStore.getItemAsync('anthropic_api_key');
  if (stored) return stored;

  // Web: use browser prompt so the demo works without pre-configuring
  if ((Platform.OS as string) === 'web' && typeof window !== 'undefined') {
    const entered = window.prompt(
      '🔑 Clave de API de Anthropic requerida para el OCR.\n' +
      'Obtenla en console.anthropic.com/settings/keys\n\n' +
      'Se guardará localmente en este navegador para futuras sesiones.'
    );
    if (entered && entered.trim().startsWith('sk-ant-')) {
      await SecureStore.setItemAsync('anthropic_api_key', entered.trim());
      return entered.trim();
    }
    throw new Error(
      'OCR requiere una clave API de Anthropic válida (sk-ant-…).\n' +
      'Ve a Configuración para guardarla de forma segura.'
    );
  }

  throw new Error('API Key de Anthropic no configurada. Ve a Configuración → sección OCR.');
}

// ── Online OCR via Claude Vision ───────────────────────────────────────────────

async function extractOnline(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png',
  seccion: Seccion
): Promise<Record<string, unknown>> {
  const apiKey = await getOrPromptApiKey();

  const clientOptions: ConstructorParameters<typeof Anthropic>[0] = { apiKey };
  if ((Platform.OS as string) === 'web') {
    (clientOptions as Record<string, unknown>).dangerouslyAllowBrowser = true;
  }
  const client = new Anthropic(clientOptions);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
          { type: 'text', text: PROMPTS[seccion] },
        ],
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const clean = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean) as Record<string, unknown>;
}

// ── Offline OCR via local Python server ───────────────────────────────────────

async function extractOffline(
  base64Image: string,
  mediaType: string,
  seccion: Seccion,
  ocrServerUrl: string
): Promise<Record<string, unknown>> {
  const body = JSON.stringify({
    image_base64: base64Image,
    media_type: mediaType,
    seccion: SECCION_MAP[seccion],
    redact_pii: true,
  });

  const res = await fetch(`${ocrServerUrl}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OCR server error ${res.status}: ${err}`);
  }

  const json = await res.json();
  if (!json.ok) throw new Error('OCR server returned ok=false');
  return json.fields as Record<string, unknown>;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface OCROptions {
  /** Force offline mode — skip Claude Vision attempt */
  offlineMode?: boolean;
  /** Base URL of the Python OCR server, e.g. "http://192.168.1.5:8765" */
  ocrServerUrl?: string;
}

/**
 * Extract BDTH form fields from a base64-encoded image or PDF.
 *
 * Strategy:
 *  1. If offlineMode is true → go straight to local Python server.
 *  2. Otherwise try Claude Vision (online).
 *  3. If Claude Vision fails (no API key / no internet) AND ocrServerUrl is set → fallback to offline.
 *  4. Otherwise rethrow.
 */
export async function extractFromImage(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'application/pdf',
  seccion: Seccion,
  options: OCROptions = {}
): Promise<Record<string, unknown>> {
  const { offlineMode = false, ocrServerUrl } = options;

  // Offline mode: go directly to local OCR server
  if (offlineMode) {
    if (!ocrServerUrl) throw new Error('Modo offline activo pero no se ha configurado la IP del servidor OCR.');
    return extractOffline(base64Image, mediaType, seccion, ocrServerUrl);
  }

  // Try online first
  try {
    if (mediaType !== 'application/pdf') {
      return await extractOnline(base64Image, mediaType as 'image/jpeg' | 'image/png', seccion);
    }
    // PDF: Claude Vision doesn't accept PDF directly — fall through to offline
    throw new Error('PDF requires offline OCR server');
  } catch (onlineErr) {
    if (!ocrServerUrl) throw onlineErr;
    // Fallback to offline OCR
    console.warn('[OCR] Online failed, using offline fallback:', onlineErr);
    return extractOffline(base64Image, mediaType, seccion, ocrServerUrl);
  }
}

// ── Date helpers ───────────────────────────────────────────────────────────────

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
