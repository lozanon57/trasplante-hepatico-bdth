import ExcelJS from 'exceljs';
import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/build/legacy/FileSystem.types';
import { formatFecha } from '../ocr/claude-vision';
import {
  listarTrasplantes,
  obtenerDonante,
  obtenerReceptorImplante,
  obtenerPostoperatorio,
  obtenerAlertasPendientes,
} from '../db/queries';

// Colores de cabecera por sección
const COLORS = {
  donante:    '1B5E20', // verde oscuro
  receptor:   '0D47A1', // azul oscuro
  postop:     'E65100', // naranja oscuro
  alertas:    'B71C1C', // rojo oscuro
  seguimiento:'4A148C', // púrpura
};

const FILL_EXITUS   = 'FFCDD2'; // rojo claro
const FILL_ALERTAS  = 'FFF9C4'; // amarillo claro
const FILL_HEADER_L = '66BB6A'; // verde claro (sub-cabeceras)

function headerFill(hex: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } };
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let max = 12;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });
}

// ─────────────────────────────────────────────
// GENERADOR PRINCIPAL
// ─────────────────────────────────────────────
export async function generarExcel(): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'BDTH App — HGM';
  wb.created  = new Date();
  wb.modified = new Date();

  const casos = listarTrasplantes();

  await generarHojaTrasplantes(wb, casos);
  await generarHojaDonantes(wb, casos);
  await generarHojaReceptores(wb, casos);
  await generarHojaPostoperatorio(wb, casos);
  await generarHojaSeguimiento(wb, casos);
  await generarHojaAlertas(wb, casos);

  // Serializar a base64
  const buffer = await wb.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  // Guardar en el sistema de archivos del dispositivo
  const path = (FileSystem.documentDirectory ?? '') + `BDTH_${isoDate()}.xlsx`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: EncodingType.Base64,
  });

  return path;
}

// ─────────────────────────────────────────────
// HOJA 1 — TRASPLANTES (resumen)
// ─────────────────────────────────────────────
async function generarHojaTrasplantes(wb: ExcelJS.Workbook, casos: ReturnType<typeof listarTrasplantes>) {
  const ws = wb.addWorksheet('Trasplantes');
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const headers = ['Código anon.', 'Fecha trasplante', 'NHC hígado', 'Estado', 'Alertas', 'Cirujano'];
  const row1 = ws.addRow(headers);
  row1.eachCell(cell => {
    cell.fill   = headerFill(COLORS.donante);
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
  });
  ws.autoFilter = { from: 'A1', to: `F1` };

  for (const c of casos) {
    const row = ws.addRow([
      c.codigo_anon,
      formatFecha(c.trasplante.fecha_trasplante),
      c.trasplante.nhc_higado ?? '',
      c.trasplante.estado ?? '',
      c.trasplante.num_alertas ?? 0,
      c.creado_por ?? '',
    ]);
    const postop = obtenerPostoperatorio(c.trasplante.id);
    if (postop?.exitus_global === 1) {
      row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FILL_EXITUS } }; });
    } else if ((c.trasplante.num_alertas ?? 0) > 0) {
      row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FILL_ALERTAS } }; });
    }
  }
  autoWidth(ws);
}

// ─────────────────────────────────────────────
// HOJA 2 — DONANTES
// ─────────────────────────────────────────────
async function generarHojaDonantes(wb: ExcelJS.Workbook, casos: ReturnType<typeof listarTrasplantes>) {
  const ws = wb.addWorksheet('Donantes');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  const baseHeaders = ['Código anon.', 'Fecha', 'Grupo ABO', 'Sexo', 'Edad', 'Peso (kg)', 'Talla (cm)',
    'Causa muerte', 'HTA', 'DM', 'DL', 'OH', 'Tabaco', 'PCR previa', 'Eco/TC',
    'Na', 'ALT', 'AST', 'Plaq', 'GGT', 'Bi', 'Cr',
    'Tipo donación', 'Riñón', 'Corazón', 'Pulmón', 'TWIT (s)', 'FWIT (s)',
    'Esteatosis', 'Perfusión', 'Anomalías art.', 'Biopsia', 'Preservación',
    // Serie sangre
    'pH-BAS', 'pH-1h', 'pH-1h30', 'pH-2h',
    'Lact-BAS', 'Lact-1h', 'Lact-1h30', 'Lact-2h',
    'ALT-BAS', 'ALT-1h', 'ALT-1h30', 'ALT-2h',
    'AST-BAS', 'AST-1h', 'AST-1h30', 'AST-2h',
    'GGT-BAS', 'GGT-1h', 'GGT-1h30', 'GGT-2h',
    'Bi-BAS', 'Bi-1h', 'Bi-1h30', 'Bi-2h',
    'INR-BAS', 'INR-1h', 'INR-1h30', 'INR-2h',
    'BNP-BAS', 'BNP-1h', 'Trop-BAS', 'Trop-1h',
    // Bilis 2h
    'Bilis pH-2h', 'Bilis Bic-2h', 'Bilis Lact-2h', 'Bilis ALT-2h',
    'Bilis GGT-2h', 'Bilis Bi-2h', 'Bilis AST-2h', 'Bilis Glu-2h', 'Bilis INR-2h',
  ];

  const row1 = ws.addRow(baseHeaders);
  row1.eachCell(cell => {
    cell.fill = headerFill(COLORS.donante);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', wrapText: true };
  });
  ws.autoFilter = { from: 'A1', to: `${colLetter(baseHeaders.length)}1` };

  for (const c of casos) {
    const d = obtenerDonante(c.trasplante.id);
    if (!d) continue;
    ws.addRow([
      c.codigo_anon, formatFecha(d.fecha), d.grupo_abo,
      d.sexo === 0 ? 'Hombre' : d.sexo === 1 ? 'Mujer' : '',
      d.edad, d.peso_kg, d.talla_cm,
      d.causa_muerte,
      yn(d.fr_hta), yn(d.fr_dm), yn(d.fr_dl), yn(d.oh), yn(d.tabaco), yn(d.pcr_previa),
      ecoTcLabel(d.eco_tc),
      d.as_na, d.as_alt, d.as_ast, d.as_plaq, d.as_ggt, d.as_bi, d.as_cr,
      d.tipo_donacion, yn(d.donacion_rinon), yn(d.donacion_corazon), yn(d.donacion_pulmon),
      d.twit_seg, d.fwit_seg,
      yn(d.esteatosis_macros), perfusionLabel(d.perfusion),
      yn(d.anomalias_arteriales), yn(d.biopsia), d.preservacion,
      // Serie sangre
      d.sangre_basal_ph, d.sangre_1h_ph, d.sangre_1h30_ph, d.sangre_2h_ph,
      d.sangre_basal_lact, d.sangre_1h_lact, d.sangre_1h30_lact, d.sangre_2h_lact,
      d.sangre_basal_alt, d.sangre_1h_alt, d.sangre_1h30_alt, d.sangre_2h_alt,
      d.sangre_basal_ast, d.sangre_1h_ast, d.sangre_1h30_ast, d.sangre_2h_ast,
      d.sangre_basal_ggt, d.sangre_1h_ggt, d.sangre_1h30_ggt, d.sangre_2h_ggt,
      d.sangre_basal_bi, d.sangre_1h_bi, d.sangre_1h30_bi, d.sangre_2h_bi,
      d.sangre_basal_inr, d.sangre_1h_inr, d.sangre_1h30_inr, d.sangre_2h_inr,
      d.sangre_basal_bnp, d.sangre_1h_bnp, d.sangre_basal_trop, d.sangre_1h_trop,
      // Bilis
      d.bilis_2h_ph, d.bilis_2h_bicarb, d.bilis_2h_lact, d.bilis_2h_alt,
      d.bilis_2h_ggt, d.bilis_2h_bi, d.bilis_2h_ast, d.bilis_2h_glu, d.bilis_2h_inr,
    ]);
  }
  autoWidth(ws);
}

// ─────────────────────────────────────────────
// HOJA 3 — RECEPTORES + IMPLANTE
// ─────────────────────────────────────────────
async function generarHojaReceptores(wb: ExcelJS.Workbook, casos: ReturnType<typeof listarTrasplantes>) {
  const ws = wb.addWorksheet('Receptores_Implante');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  const headers = ['Código anon.', 'Sexo', 'Edad', 'Peso (kg)', 'Talla (cm)',
    'Hepatopatía', 'CHC', 'HTA', 'DM', 'DL', 'Tabaco', 'OH', 'MELD',
    'ALT', 'AST', 'Cr', 'Plaq', 'GGT', 'INR', 'Bi',
    'Técnica', 'Reperfusión', 'Sínd.Reperfusión', 'Vía biliar',
    'Peso injerto (g)', 'Flujo portal', 'Flujo arterial',
    'T.Isq.Fría (min)', 'T.Pres.HOPE (min)', 'T.Isq.Caliente (min)', 'T.Isq.Total (min)',
    'ReTHO', 'PDR',
    'HOPE inicio', 'HOPE fin', 'HOPE tiempo (min)', 'HOPE causa', 'HOPE tipo',
    'HOPE flujo', 'HOPE presión', 'HOPE PO2',
  ];

  const row1 = ws.addRow(headers);
  row1.eachCell(cell => {
    cell.fill = headerFill(COLORS.receptor);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', wrapText: true };
  });

  for (const c of casos) {
    const r = obtenerReceptorImplante(c.trasplante.id);
    if (!r) continue;
    ws.addRow([
      c.codigo_anon,
      r.sexo === 0 ? 'Hombre' : r.sexo === 1 ? 'Mujer' : '',
      r.edad, r.peso_kg, r.talla_cm, r.origen_hepatopatia, yn(r.chc),
      yn(r.fr_hta), yn(r.fr_dm), yn(r.fr_dl), yn(r.tabaco), yn(r.oh), r.meld,
      r.as_alt, r.as_ast, r.as_cr, r.as_plaq, r.as_ggt, r.as_inr, r.as_bi,
      tecnicaLabel(r.tecnica), perfusionLabel(r.reperfusion), sindromeLabel(r.sindrome_reperfusion),
      r.vb_tecnica === 0 ? 'Colédoco-colédoco' : r.vb_tecnica === 1 ? 'Hepático-yeyuno' : '',
      r.peso_injerto, r.flujo_portal, r.flujo_arterial,
      r.t_isquemia_fria, r.t_preservacion_hope, r.t_isquemia_caliente, r.t_isquemia_total,
      yn(r.retho), r.pdr,
      formatFecha(r.hope_hora_inicio), formatFecha(r.hope_hora_fin),
      r.hope_tiempo_min, r.hope_causa,
      r.hope_tipo === 0 ? 'Single HOPE' : r.hope_tipo === 1 ? 'Dual HOPE' : '',
      r.hope_flujo, r.hope_presion, r.hope_po2,
    ]);
  }
  autoWidth(ws);
}

// ─────────────────────────────────────────────
// HOJA 4 — POSTOPERATORIO
// ─────────────────────────────────────────────
async function generarHojaPostoperatorio(wb: ExcelJS.Workbook, casos: ReturnType<typeof listarTrasplantes>) {
  const ws = wb.addWorksheet('Postoperatorio');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  const headers = ['Código anon.',
    'Pico ALT', 'Pico AST', 'Pico GGT', 'Pico INR', 'Pico Cr', 'Pico Plaq', 'Pico Bi',
    'Disfunción Olthoff', 'Bi>10', 'INR>1.6', 'ALT/AST>2000',
    'Sangrado', 'Reintervención', 'Causa reintervención',
    'Fecha alta', 'Estancia total (d)', 'Estancia REA (d)',
    'Complicaciones PO', 'Clavien-Dindo',
    'EAD Olthoff', 'PNF', 'Trombosis arterial', 'Complicación biliar',
    'Estenosis no anast.', 'Fuga biliar', 'Rechazo agudo',
  ];

  const row1 = ws.addRow(headers);
  row1.eachCell(cell => {
    cell.fill = headerFill(COLORS.postop);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', wrapText: true };
  });

  for (const c of casos) {
    const p = obtenerPostoperatorio(c.trasplante.id);
    if (!p) continue;
    const row = ws.addRow([
      c.codigo_anon,
      p.pico_alt, p.pico_ast, p.pico_ggt, p.pico_inr, p.pico_cr, p.pico_plaq, p.pico_bi,
      yn(p.disfuncion_olthoff_7dpo), yn(p.bi_mayor_10), yn(p.inr_mayor_16), yn(p.alt_ast_mayor_2000),
      yn(p.sangrado), yn(p.reintervencion), p.reintervencion_causa ?? '',
      formatFecha(p.fecha_alta), p.dias_estancia_total, p.dias_estancia_rea,
      yn(p.complicaciones_po), p.clavien_dindo,
      yn(p.ead_olthoff), yn(p.pnf), yn(p.trombosis_arterial),
      yn(p.complicacion_biliar), yn(p.estenosis_biliar_no_anast),
      yn(p.fuga_biliar), yn(p.rechazo_agudo),
    ]);
    if (p.exitus_global === 1) {
      row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + FILL_EXITUS } }; });
    }
  }
  autoWidth(ws);
}

// ─────────────────────────────────────────────
// HOJA 5 — SEGUIMIENTO
// ─────────────────────────────────────────────
async function generarHojaSeguimiento(wb: ExcelJS.Workbook, casos: ReturnType<typeof listarTrasplantes>) {
  const ws = wb.addWorksheet('Seguimiento');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  const headers = ['Código anon.', 'Última revisión', 'Éxitus global',
    'Éxitus 7d', 'Fecha éxitus 7d', 'Causa éxitus 7d',
    'Éxitus 30d', 'Fecha éxitus 30d', 'Causa éxitus 30d',
    'Pérdida injerto', 'Fecha pérdida', 'Causa pérdida',
    'Retrasplante', 'Fecha retrasplante', 'Causa retrasplante',
    'RM 6 meses',
    'Colangiopatía intrahepática', 'Fecha colangiopatía ih',
    'Colangiopatía', 'Fecha colangiopatía',
    'Estenosis anastomosis', 'Fecha estenosis',
  ];

  const row1 = ws.addRow(headers);
  row1.eachCell(cell => {
    cell.fill = headerFill(COLORS.seguimiento);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', wrapText: true };
  });

  for (const c of casos) {
    const p = obtenerPostoperatorio(c.trasplante.id);
    if (!p) continue;
    ws.addRow([
      c.codigo_anon, formatFecha(p.fecha_ultima_revision), yn(p.exitus_global),
      yn(p.exitus_7d), formatFecha(p.exitus_7d_fecha), p.exitus_7d_causa ?? '',
      yn(p.exitus_30d), formatFecha(p.exitus_30d_fecha), p.exitus_30d_causa ?? '',
      yn(p.perdida_injerto), formatFecha(p.perdida_injerto_fecha), p.causa_perdida_injerto ?? '',
      yn(p.retrasplante), formatFecha(p.retrasplante_fecha), p.causa_retrasplante ?? '',
      yn(p.rm_6meses),
      yn(p.colangiopatia_intrahepatica), formatFecha(p.colangiopatia_intrahepatica_fecha),
      yn(p.colangiopatia), formatFecha(p.colangiopatia_fecha),
      yn(p.estenosis_anastomosis), formatFecha(p.estenosis_anastomosis_fecha),
    ]);
  }
  autoWidth(ws);
}

// ─────────────────────────────────────────────
// HOJA 6 — ALERTAS PENDIENTES
// ─────────────────────────────────────────────
async function generarHojaAlertas(wb: ExcelJS.Workbook, casos: ReturnType<typeof listarTrasplantes>) {
  const ws = wb.addWorksheet('Alertas_Pendientes');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

  const headers = ['Código anon.', 'Tipo', 'Sección', 'Campo', 'Mensaje', 'Fecha'];
  const row1 = ws.addRow(headers);
  row1.eachCell(cell => {
    cell.fill = headerFill(COLORS.alertas);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center' };
  });

  for (const c of casos) {
    const alertas = obtenerAlertasPendientes(c.trasplante.id);
    for (const a of alertas) {
      const row = ws.addRow([
        c.codigo_anon, a.tipo, a.seccion, a.campo, a.mensaje, formatFecha(a.fecha),
      ]);
      if (a.tipo === 'critica') {
        row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } }; });
        row.font = { bold: true };
      }
    }
  }
  autoWidth(ws);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function yn(v: number | null | undefined): string {
  if (v === 1) return 'Sí';
  if (v === 0) return 'No';
  return '';
}

function ecoTcLabel(v: number | null | undefined): string {
  return ['Normal', 'Esteatosis leve', 'Esteatosis moderada', 'Otro'][v ?? -1] ?? '';
}

function perfusionLabel(v: number | null | undefined): string {
  return ['Buena', 'Regular', 'Mala'][v ?? -1] ?? '';
}

function tecnicaLabel(v: number | null | undefined): string {
  return ['Piggyback', 'Clásica'][v ?? -1] ?? '';
}

function sindromeLabel(v: number | null | undefined): string {
  return ['No', 'Leve', 'Moderado', 'Grave'][v ?? -1] ?? '';
}

function colLetter(n: number): string {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function isoDate(): string {
  return new Date().toISOString().split('T')[0];
}
