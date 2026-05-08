import * as Notifications from 'expo-notifications';
import {
  borrarAlertasTrasplante,
  insertarAlerta,
  obtenerDonante,
  obtenerPostoperatorio,
  obtenerReceptorImplante,
  obtenerTrasplante,
  actualizarEstadoTrasplante,
} from '../db/queries';

type AlertaInput = {
  trasplante_id: number;
  tipo: 'campo_vacio' | 'seguimiento_pendiente' | 'critica';
  seccion: string;
  campo: string;
  mensaje: string;
};

// ─────────────────────────────────────────────
// CAMPOS CRÍTICOS POR SECCIÓN
// ─────────────────────────────────────────────
const CAMPOS_CRITICOS_DONANTE: Array<{ campo: string; label: string }> = [
  { campo: 'fecha',          label: 'Fecha extracción' },
  { campo: 'grupo_abo',      label: 'Grupo ABO donante' },
  { campo: 'causa_muerte',   label: 'Causa de muerte' },
  { campo: 'tipo_donacion',  label: 'Tipo de donación' },
  { campo: 'twit_seg',       label: 'Tiempo caliente total (TWIT)' },
  { campo: 'fwit_seg',       label: 'Tiempo caliente funcional (FWIT)' },
  { campo: 'perfusion',      label: 'Calidad de perfusión' },
];

const CAMPOS_CRITICOS_IMPLANTE: Array<{ campo: string; label: string }> = [
  { campo: 'meld',             label: 'MELD preoperatorio' },
  { campo: 'tecnica',          label: 'Técnica de implante' },
  { campo: 'reperfusion',      label: 'Calidad de reperfusión' },
  { campo: 't_isquemia_total', label: 'Tiempo isquemia total' },
  { campo: 't_isquemia_fria',  label: 'Tiempo isquemia fría' },
  { campo: 'vb_tecnica',       label: 'Técnica vía biliar' },
];

const CAMPOS_CRITICOS_POSTOP: Array<{ campo: string; label: string }> = [
  { campo: 'dias_estancia_total', label: 'Días de estancia total' },
  { campo: 'complicaciones_po',   label: 'Complicaciones postoperatorias' },
  { campo: 'clavien_dindo',       label: 'Clasificación Clavien-Dindo' },
];

// ─────────────────────────────────────────────
// GENERADOR PRINCIPAL DE ALERTAS
// ─────────────────────────────────────────────
export async function generarAlertas(trasplante_id: number): Promise<number> {
  const alertas: AlertaInput[] = [];

  const trasplante   = obtenerTrasplante(trasplante_id);
  const donanteData  = obtenerDonante(trasplante_id);
  const implanteData = obtenerReceptorImplante(trasplante_id);
  const postopData   = obtenerPostoperatorio(trasplante_id);

  // ── 1. CAMPOS VACÍOS ──────────────────────
  if (donanteData) {
    for (const { campo, label } of CAMPOS_CRITICOS_DONANTE) {
      const val = (donanteData as Record<string, unknown>)[campo];
      if (val === null || val === undefined || val === '') {
        alertas.push({
          trasplante_id,
          tipo: 'campo_vacio',
          seccion: 'donante',
          campo,
          mensaje: `Campo vacío en Donante: ${label}`,
        });
      }
    }
  }

  if (implanteData) {
    for (const { campo, label } of CAMPOS_CRITICOS_IMPLANTE) {
      const val = (implanteData as Record<string, unknown>)[campo];
      if (val === null || val === undefined || val === '') {
        alertas.push({
          trasplante_id,
          tipo: 'campo_vacio',
          seccion: 'implante',
          campo,
          mensaje: `Campo vacío en Implante: ${label}`,
        });
      }
    }
  }

  if (postopData) {
    for (const { campo, label } of CAMPOS_CRITICOS_POSTOP) {
      const val = (postopData as Record<string, unknown>)[campo];
      if (val === null || val === undefined || val === '') {
        alertas.push({
          trasplante_id,
          tipo: 'campo_vacio',
          seccion: 'postoperatorio',
          campo,
          mensaje: `Campo vacío en Postoperatorio: ${label}`,
        });
      }
    }
  }

  // ── 2. SEGUIMIENTO PENDIENTE ───────────────
  const fechaTx = trasplante?.fecha_trasplante;
  if (fechaTx && postopData) {
    const ahora = Date.now();
    const diasTranscurridos = (ahora - fechaTx) / (1000 * 60 * 60 * 24);

    if (diasTranscurridos >= 7 && postopData.exitus_7d === null) {
      alertas.push({
        trasplante_id, tipo: 'seguimiento_pendiente', seccion: 'postoperatorio',
        campo: 'exitus_7d',
        mensaje: 'Registrar estado del paciente a los 7 días del trasplante',
      });
    }

    if (diasTranscurridos >= 30 && postopData.exitus_30d === null) {
      alertas.push({
        trasplante_id, tipo: 'seguimiento_pendiente', seccion: 'postoperatorio',
        campo: 'exitus_30d',
        mensaje: 'Registrar estado del paciente a los 30 días del trasplante',
      });
    }

    if (diasTranscurridos >= 180 && postopData.rm_6meses === null) {
      alertas.push({
        trasplante_id, tipo: 'seguimiento_pendiente', seccion: 'postoperatorio',
        campo: 'rm_6meses',
        mensaje: 'Registrar RM a los 6 meses del trasplante',
      });
    }

    const fechaRevision = postopData.fecha_ultima_revision;
    if (fechaRevision) {
      const diasSinRevision = (ahora - fechaRevision) / (1000 * 60 * 60 * 24);
      if (diasSinRevision > 90) {
        alertas.push({
          trasplante_id, tipo: 'seguimiento_pendiente', seccion: 'postoperatorio',
          campo: 'fecha_ultima_revision',
          mensaje: `Revisión pendiente: han pasado ${Math.round(diasSinRevision)} días sin actualización`,
        });
      }
    }
  }

  // ── 3. ALERTAS CRÍTICAS ────────────────────
  if (postopData) {
    if (postopData.pnf === 1 && !postopData.retrasplante) {
      alertas.push({
        trasplante_id, tipo: 'critica', seccion: 'postoperatorio',
        campo: 'pnf',
        mensaje: 'PNF documentado sin retrasplante registrado — revisar urgente',
      });
    }

    if (postopData.trombosis_arterial === 1 && !postopData.reintervencion) {
      alertas.push({
        trasplante_id, tipo: 'critica', seccion: 'postoperatorio',
        campo: 'trombosis_arterial',
        mensaje: 'Trombosis arterial sin reintervención registrada',
      });
    }

    if (postopData.perdida_injerto === 1 && !postopData.causa_perdida_injerto) {
      alertas.push({
        trasplante_id, tipo: 'critica', seccion: 'postoperatorio',
        campo: 'perdida_injerto',
        mensaje: 'Pérdida de injerto sin causa documentada',
      });
    }

    if (postopData.exitus_global === 1 && !postopData.exitus_30d_causa && !postopData.exitus_7d_causa) {
      alertas.push({
        trasplante_id, tipo: 'critica', seccion: 'postoperatorio',
        campo: 'exitus_global',
        mensaje: 'Éxitus documentado sin fecha ni causa registrada',
      });
    }
  }

  // ── GUARDAR ────────────────────────────────
  borrarAlertasTrasplante(trasplante_id);
  const now = Date.now();
  for (const a of alertas) {
    insertarAlerta({ ...a, resuelta: 0, fecha: now });
  }

  // Actualizar contador + estado del trasplante
  const nAlerts = alertas.length;
  const tieneSeccionesCriticas = alertas.some(a => a.tipo === 'critica');
  const secciones = new Set([
    donanteData   ? 'donante'   : null,
    implanteData  ? 'implante'  : null,
    postopData    ? 'postop'    : null,
  ].filter(Boolean));

  let estado: string;
  if (secciones.size === 3 && nAlerts === 0) estado = 'completo';
  else if (secciones.size > 0)               estado = 'incompleto';
  else                                        estado = 'borrador';

  actualizarEstadoTrasplante(trasplante_id, estado, nAlerts);
  return nAlerts;
}

// ─────────────────────────────────────────────
// NOTIFICACIONES LOCALES PROGRAMADAS
// ─────────────────────────────────────────────
export async function programarNotificacionesSeguimiento(
  trasplante_id: number,
  codigo_anon: string,
  fechaTrasplante: number
): Promise<void> {
  await Notifications.requestPermissionsAsync();

  const hitos = [
    { dias: 7,   mensaje: `Registrar estado 7 días — ${codigo_anon}` },
    { dias: 30,  mensaje: `Registrar estado 30 días — ${codigo_anon}` },
    { dias: 180, mensaje: `Registrar RM 6 meses — ${codigo_anon}` },
  ];

  for (const hito of hitos) {
    const triggerDate = new Date(fechaTrasplante + hito.dias * 24 * 60 * 60 * 1000);
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'BDTH · Seguimiento pendiente',
          body: hito.mensaje,
          data: { trasplante_id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
    }
  }
}

// ─────────────────────────────────────────────
// CONFIGURAR HANDLER DE NOTIFICACIONES
// ─────────────────────────────────────────────
export function configurarNotificaciones() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
