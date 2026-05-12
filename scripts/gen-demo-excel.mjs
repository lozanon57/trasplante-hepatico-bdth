// Genera BDTH_demo.xlsx con los mismos 6 sheets que la app móvil
// Ejecutar desde la raíz del proyecto: node scripts/gen-demo-excel.mjs
// Requiere: npm install   (exceljs ya está en package.json)

import ExcelJS from 'exceljs';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'BDTH_demo.xlsx');

// ─── Colores ──────────────────────────────────────────────────────────────────
const C = {
  donante:    '1B5E20',
  receptor:   '0D47A1',
  postop:     'E65100',
  alertas:    'B71C1C',
  seguimiento:'4A148C',
  exitus:     'FFCDD2',
  alertaFill: 'FFF9C4',
};

const fill = hex => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } });
const hdrStyle = hex => ({
  fill:      fill(hex),
  font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
  alignment: { horizontal: 'center', wrapText: true },
});
const autoWidth = ws => {
  ws.columns.forEach(col => {
    let max = 12;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });
};
const colLetter = n => {
  let r = '';
  while (n > 0) { r = String.fromCharCode(64 + ((n - 1) % 26 + 1)) + r; n = Math.floor((n - 1) / 26); }
  return r;
};
const yn = v => v === 1 ? 'Sí' : v === 0 ? 'No' : '';
const fd = ts => ts ? new Date(ts).toLocaleDateString('es-ES') : '';

// ─── Demo data (18 trasplantes + 4 donantes rechazados) ───────────────────────
const CIRUJANOS = ['García Pérez','López Martínez','Rodríguez Sánchez','Fernández Ruiz','Martínez López'];
const now = Date.now();
const dAgo = d => now - d * 86_400_000;

const CASES = [
  { id:1,  codigo:'TH-A1B2C3', fecha:dAgo(14),  cir:CIRUJANOS[0], estado:'completo',
    don:{ sexo:'Hombre', edad:52, peso:78, talla:172, causa:'TCE',    tipo:'DBD',  abo:'A', hta:'Sí', dm:'No', est:'No',  perf:'Buena',   twit:0,    fwit:0,   na:140, alt:42, cr:0.9,
          ph_bas:7.38, ph_1h:7.35, ph_1h30:7.32, ph_2h:7.30, lact_bas:1.2, lact_1h:1.8, lact_1h30:2.1, lact_2h:2.4 },
    rec:{ sexo:'Hombre', edad:58, peso:74, talla:170, hep:'Cirrosis VHC + CHC', chc:'Sí', meld:22, alt:95, inr:1.4, bi:3.2, tif:385, tih:44, tecnica:'Piggyback' },
    po:{ pAlt:820, pAst:980, estancia:11, rea:3, ead:'No', pnf:'No', trombosis:'No', bil:'No', rechazo:'No', reinterv:'No', clavien:0, exitus7:'No', exitus30:'No' } },

  { id:2,  codigo:'TH-D4E5F6', fecha:dAgo(28),  cir:CIRUJANOS[1], estado:'completo',
    don:{ sexo:'Mujer',  edad:45, peso:62, talla:162, causa:'HIC',    tipo:'DBD',  abo:'O', hta:'Sí', dm:'Sí', est:'No',  perf:'Buena',   twit:0,    fwit:0,   na:138, alt:55, cr:1.1,
          ph_bas:7.40, ph_1h:7.37, ph_1h30:7.34, ph_2h:7.31, lact_bas:0.9, lact_1h:1.4, lact_1h30:1.7, lact_2h:2.0 },
    rec:{ sexo:'Mujer',  edad:52, peso:60, talla:162, hep:'Cirrosis alcohólica', chc:'No', meld:18, alt:180, inr:1.6, bi:4.8, tif:420, tih:50, tecnica:'Piggyback' },
    po:{ pAlt:650, pAst:720, estancia:10, rea:2, ead:'No', pnf:'No', trombosis:'No', bil:'No', rechazo:'No', reinterv:'No', clavien:0, exitus7:'No', exitus30:'No' } },

  { id:3,  codigo:'TH-G7H8I9', fecha:dAgo(44),  cir:CIRUJANOS[2], estado:'alerta',
    don:{ sexo:'Hombre', edad:60, peso:85, talla:176, causa:'ACV',    tipo:'DCD',  abo:'B', hta:'Sí', dm:'No', est:'Sí',  perf:'Regular', twit:1200, fwit:240, na:137, alt:88, cr:1.3,
          ph_bas:7.31, ph_1h:7.25, ph_1h30:7.20, ph_2h:7.18, lact_bas:2.1, lact_1h:3.4, lact_1h30:4.2, lact_2h:5.1 },
    rec:{ sexo:'Hombre', edad:61, peso:80, talla:175, hep:'CHC sobre cirrosis alcohólica', chc:'Sí', meld:28, alt:220, inr:1.9, bi:6.1, tif:490, tih:42, tecnica:'Clásica' },
    po:{ pAlt:2800, pAst:3100, estancia:22, rea:6, ead:'Sí', pnf:'No', trombosis:'No', bil:'No', rechazo:'No', reinterv:'Sí', clavien:3, exitus7:'No', exitus30:'No' } },

  { id:4,  codigo:'TH-J0K1L2', fecha:dAgo(58),  cir:CIRUJANOS[3], estado:'completo',
    don:{ sexo:'Mujer',  edad:38, peso:58, talla:158, causa:'Anoxia', tipo:'HOPE', abo:'A', hta:'No', dm:'No', est:'No',  perf:'Buena',   twit:0,    fwit:0,   na:142, alt:30, cr:0.8,
          ph_bas:7.42, ph_1h:7.40, ph_1h30:7.38, ph_2h:7.36, lact_bas:0.8, lact_1h:1.1, lact_1h30:1.3, lact_2h:1.5 },
    rec:{ sexo:'Mujer',  edad:45, peso:55, talla:158, hep:'Fallo hepático agudo', chc:'No', meld:35, alt:1200, inr:2.8, bi:12.4, tif:295, tih:38, tecnica:'Piggyback' },
    po:{ pAlt:980, pAst:1100, estancia:8, rea:2, ead:'No', pnf:'No', trombosis:'No', bil:'No', rechazo:'No', reinterv:'No', clavien:0, exitus7:'No', exitus30:'No' } },

  { id:5,  codigo:'TH-M3N4O5', fecha:dAgo(71),  cir:CIRUJANOS[4], estado:'completo',
    don:{ sexo:'Hombre', edad:55, peso:90, talla:180, causa:'TCE',    tipo:'DBD',  abo:'AB',hta:'No', dm:'Sí', est:'No',  perf:'Buena',   twit:0,    fwit:0,   na:141, alt:48, cr:1.0,
          ph_bas:7.39, ph_1h:7.36, ph_1h30:7.34, ph_2h:7.32, lact_bas:1.0, lact_1h:1.6, lact_1h30:1.9, lact_2h:2.2 },
    rec:{ sexo:'Hombre', edad:55, peso:82, talla:178, hep:'Cirrosis VHB + CHC', chc:'Sí', meld:24, alt:140, inr:1.5, bi:3.8, tif:350, tih:40, tecnica:'Piggyback' },
    po:{ pAlt:740, pAst:810, estancia:11, rea:3, ead:'No', pnf:'No', trombosis:'No', bil:'No', rechazo:'No', reinterv:'No', clavien:0, exitus7:'No', exitus30:'No' } },

  { id:6,  codigo:'TH-P6Q7R8', fecha:dAgo(89),  cir:CIRUJANOS[0], estado:'alerta',
    don:{ sexo:'Mujer',  edad:49, peso:68, talla:165, causa:'HIC',    tipo:'DBD',  abo:'O', hta:'Sí', dm:'No', est:'No',  perf:'Buena',   twit:0,    fwit:0,   na:139, alt:60, cr:0.9,
          ph_bas:7.41, ph_1h:7.38, ph_1h30:7.35, ph_2h:7.33, lact_bas:1.1, lact_1h:1.7, lact_1h30:2.0, lact_2h:2.3 },
    rec:{ sexo:'Mujer',  edad:48, peso:58, talla:163, hep:'Colangitis esclerosante primaria (PSC)', chc:'No', meld:20, alt:280, inr:1.7, bi:8.2, tif:440, tih:55, tecnica:'Piggyback' },
    po:{ pAlt:560, pAst:620, estancia:24, rea:5, ead:'No', pnf:'No', trombosis:'No', bil:'Sí', rechazo:'No', reinterv:'Sí', clavien:3, exitus7:'No', exitus30:'No' } },

  { id:7,  codigo:'TH-S9T0U1', fecha:dAgo(103), cir:CIRUJANOS[1], estado:'alerta',
    don:{ sexo:'Hombre', edad:63, peso:88, talla:174, causa:'ACV',    tipo:'DCD',  abo:'A', hta:'Sí', dm:'Sí', est:'Sí',  perf:'Mala',    twit:1080, fwit:200, na:136, alt:95, cr:1.5,
          ph_bas:7.28, ph_1h:7.20, ph_1h30:7.15, ph_2h:7.12, lact_bas:2.8, lact_1h:4.2, lact_1h30:5.5, lact_2h:6.8 },
    rec:{ sexo:'Hombre', edad:63, peso:86, talla:174, hep:'Cirrosis metabólica (NASH) + CHC', chc:'Sí', meld:32, alt:310, inr:2.1, bi:7.9, tif:510, tih:48, tecnica:'Clásica' },
    po:{ pAlt:3200, pAst:3600, estancia:32, rea:9, ead:'Sí', pnf:'No', trombosis:'No', bil:'No', rechazo:'Sí', reinterv:'Sí', clavien:4, exitus7:'No', exitus30:'No' } },

  { id:8,  codigo:'TH-V2W3X4', fecha:dAgo(118), cir:CIRUJANOS[2], estado:'completo',
    don:{ sexo:'Mujer',  edad:41, peso:55, talla:160, causa:'TCE',    tipo:'HOPE', abo:'B', hta:'No', dm:'No', est:'No',  perf:'Buena',   twit:0,    fwit:0,   na:143, alt:35, cr:0.7,
          ph_bas:7.44, ph_1h:7.42, ph_1h30:7.40, ph_2h:7.38, lact_bas:0.7, lact_1h:1.0, lact_1h30:1.2, lact_2h:1.4 },
    rec:{ sexo:'Mujer',  edad:40, peso:53, talla:160, hep:'Enfermedad de Wilson — fallo agudo', chc:'No', meld:38, alt:980, inr:3.2, bi:18.6, tif:285, tih:35, tecnica:'Piggyback' },
    po:{ pAlt:1400, pAst:1600, estancia:7, rea:2, ead:'No', pnf:'No', trombosis:'No', bil:'No', rechazo:'No', reinterv:'No', clavien:0, exitus7:'No', exitus30:'No' } },

  // ── 4 donantes rechazados ────────────────────────────────────────────────────
  { id:19, codigo:'DNV-Y5Z6A7', fecha:dAgo(20),  cir:CIRUJANOS[3], estado:'donante-no-válido',
    don:{ sexo:'Hombre', edad:68, peso:95, talla:178, causa:'TCE',    tipo:'DBD',  abo:'A', hta:'Sí', dm:'Sí', est:'Sí',  perf:'Mala',   twit:0, fwit:0, na:148, alt:320, cr:2.1 },
    rec:null, po:null },
  { id:20, codigo:'DNV-B8C9D0', fecha:dAgo(55),  cir:CIRUJANOS[4], estado:'donante-no-válido',
    don:{ sexo:'Mujer',  edad:72, peso:58, talla:155, causa:'ACV',    tipo:'DBD',  abo:'O', hta:'Sí', dm:'No', est:'Sí',  perf:'Mala',   twit:0, fwit:0, na:152, alt:280, cr:1.9 },
    rec:null, po:null },
  { id:21, codigo:'DNV-E1F2G3', fecha:dAgo(88),  cir:CIRUJANOS[0], estado:'donante-no-válido',
    don:{ sexo:'Hombre', edad:65, peso:102,talla:182, causa:'Anoxia', tipo:'DCD',  abo:'B', hta:'Sí', dm:'Sí', est:'Sí',  perf:'Mala',   twit:900,fwit:180,na:145, alt:410, cr:2.4 },
    rec:null, po:null },
  { id:22, codigo:'DNV-H4I5J6', fecha:dAgo(122), cir:CIRUJANOS[1], estado:'donante-no-válido',
    don:{ sexo:'Mujer',  edad:70, peso:62, talla:160, causa:'HIC',    tipo:'DBD',  abo:'A', hta:'No', dm:'No', est:'Sí',  perf:'Mala',   twit:0, fwit:0, na:150, alt:350, cr:1.7 },
    rec:null, po:null },
];

// ─── Sheet 1: Trasplantes ─────────────────────────────────────────────────────
function sheet1(wb) {
  const ws = wb.addWorksheet('Trasplantes');
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  const hdrs = ['Código anon.', 'Fecha', 'Estado', 'Cirujano', 'Tipo donación', 'Grupo ABO'];
  const r = ws.addRow(hdrs);
  hdrs.forEach((_, i) => Object.assign(ws.getCell(1, i+1), hdrStyle(C.donante)));
  ws.autoFilter = { from: 'A1', to: `${colLetter(hdrs.length)}1` };
  for (const c of CASES) {
    const row = ws.addRow([c.codigo, fd(c.fecha), c.estado, c.cir, c.don?.tipo ?? '', c.don?.abo ?? '']);
    if (c.estado === 'donante-no-válido') row.eachCell(cell => { cell.fill = fill('FFF9C4'); });
    if (c.po?.exitus30 === 'Sí') row.eachCell(cell => { cell.fill = fill(C.exitus); });
  }
  autoWidth(ws);
}

// ─── Sheet 2: Donantes ───────────────────────────────────────────────────────
function sheet2(wb) {
  const ws = wb.addWorksheet('Donantes');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  const hdrs = [
    'Código anon.', 'Fecha', 'Sexo', 'Edad', 'Peso (kg)', 'Talla (cm)',
    'Causa muerte', 'Tipo donación', 'Grupo ABO',
    'HTA', 'DM', 'Esteatosis', 'Perfusión',
    'TWIT (s)', 'FWIT (s)', 'Na', 'ALT', 'Cr',
    'pH-BASAL', 'pH-1h', 'pH-1h30', 'pH-2h',
    'Lact-BASAL', 'Lact-1h', 'Lact-1h30', 'Lact-2h',
  ];
  const r1 = ws.addRow(hdrs);
  hdrs.forEach((_, i) => Object.assign(ws.getCell(1, i+1), hdrStyle(C.donante)));
  ws.autoFilter = { from: 'A1', to: `${colLetter(hdrs.length)}1` };
  for (const c of CASES) {
    if (!c.don) continue;
    const d = c.don;
    ws.addRow([
      c.codigo, fd(c.fecha), d.sexo, d.edad, d.peso, d.talla,
      d.causa, d.tipo, d.abo,
      d.hta, d.dm, d.est, d.perf,
      d.twit, d.fwit, d.na, d.alt, d.cr,
      d.ph_bas ?? '', d.ph_1h ?? '', d.ph_1h30 ?? '', d.ph_2h ?? '',
      d.lact_bas ?? '', d.lact_1h ?? '', d.lact_1h30 ?? '', d.lact_2h ?? '',
    ]);
  }
  autoWidth(ws);
}

// ─── Sheet 3: Receptores + Implante ─────────────────────────────────────────
function sheet3(wb) {
  const ws = wb.addWorksheet('Receptores_Implante');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  const hdrs = [
    'Código anon.', 'Sexo', 'Edad', 'Peso (kg)', 'Talla (cm)',
    'Hepatopatía', 'CHC', 'MELD',
    'ALT preop.', 'INR preop.', 'Bilirrubina preop.',
    'TIF (min)', 'TIH (min)', 'Técnica',
  ];
  const r1 = ws.addRow(hdrs);
  hdrs.forEach((_, i) => Object.assign(ws.getCell(1, i+1), hdrStyle(C.receptor)));
  ws.autoFilter = { from: 'A1', to: `${colLetter(hdrs.length)}1` };
  for (const c of CASES) {
    if (!c.rec) continue;
    const r = c.rec;
    ws.addRow([
      c.codigo, r.sexo, r.edad, r.peso, r.talla,
      r.hep, r.chc, r.meld, r.alt, r.inr, r.bi,
      r.tif, r.tih, r.tecnica,
    ]);
  }
  autoWidth(ws);
}

// ─── Sheet 4: Postoperatorio ─────────────────────────────────────────────────
function sheet4(wb) {
  const ws = wb.addWorksheet('Postoperatorio');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  const hdrs = [
    'Código anon.',
    'Pico ALT', 'Pico AST',
    'Estancia total (d)', 'Estancia REA (d)',
    'EAD Olthoff', 'PNF', 'Trombosis art.',
    'Complicación biliar', 'Rechazo agudo', 'Reintervención',
    'Clavien-Dindo', 'Éxitus 7d', 'Éxitus 30d',
  ];
  const r1 = ws.addRow(hdrs);
  hdrs.forEach((_, i) => Object.assign(ws.getCell(1, i+1), hdrStyle(C.postop)));
  ws.autoFilter = { from: 'A1', to: `${colLetter(hdrs.length)}1` };
  for (const c of CASES) {
    if (!c.po) continue;
    const p = c.po;
    const row = ws.addRow([
      c.codigo, p.pAlt, p.pAst, p.estancia, p.rea,
      p.ead, p.pnf, p.trombosis, p.bil, p.rechazo, p.reinterv,
      p.clavien, p.exitus7, p.exitus30,
    ]);
    if (p.exitus30 === 'Sí') row.eachCell(cell => { cell.fill = fill(C.exitus); row.font = { bold: true }; });
    if (p.ead === 'Sí' || p.pnf === 'Sí') row.eachCell(cell => { cell.fill = fill(C.alertaFill); });
  }
  autoWidth(ws);
}

// ─── Sheet 5: Seguimiento ────────────────────────────────────────────────────
function sheet5(wb) {
  const ws = wb.addWorksheet('Seguimiento');
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  const hdrs = ['Código anon.', 'Éxitus global', 'Éxitus 7d', 'Éxitus 30d', 'Pérdida injerto', 'Retrasplante', 'RM 6 meses'];
  const r1 = ws.addRow(hdrs);
  hdrs.forEach((_, i) => Object.assign(ws.getCell(1, i+1), hdrStyle(C.seguimiento)));
  for (const c of CASES) {
    if (!c.po) continue;
    const p = c.po;
    ws.addRow([c.codigo, 'No', p.exitus7, p.exitus30, 'No', 'No', '—']);
  }
  autoWidth(ws);
}

// ─── Sheet 6: Alertas ────────────────────────────────────────────────────────
function sheet6(wb) {
  const ws = wb.addWorksheet('Alertas_Pendientes');
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  const hdrs = ['Código anon.', 'Tipo', 'Campo', 'Mensaje'];
  const r1 = ws.addRow(hdrs);
  hdrs.forEach((_, i) => Object.assign(ws.getCell(1, i+1), hdrStyle(C.alertas)));
  for (const c of CASES) {
    if (!c.po) continue;
    if (c.po.ead === 'Sí') {
      const row = ws.addRow([c.codigo, 'crítica', 'EAD Olthoff', 'Disfunción primaria del injerto detectada']);
      row.eachCell(cell => { cell.fill = fill(C.exitus); });
    }
    if (c.po.trombosis === 'Sí') {
      const row = ws.addRow([c.codigo, 'crítica', 'Trombosis arterial', 'Trombosis arteria hepática post-trasplante']);
      row.eachCell(cell => { cell.fill = fill(C.exitus); });
    }
    if (c.po.bil === 'Sí') {
      ws.addRow([c.codigo, 'aviso', 'Complicación biliar', 'Fuga o estenosis biliar documentada']);
    }
  }
  autoWidth(ws);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const wb = new ExcelJS.Workbook();
wb.creator  = 'BDTH App — HGM';
wb.created  = new Date();
wb.modified = new Date();

sheet1(wb);
sheet2(wb);
sheet3(wb);
sheet4(wb);
sheet5(wb);
sheet6(wb);

const buffer = await wb.xlsx.writeBuffer();
writeFileSync(OUT, Buffer.from(buffer));

console.log(`\n✅ Excel generado: ${OUT}`);
console.log(`   - Sheet 1: Trasplantes (${CASES.length} filas)`);
console.log(`   - Sheet 2: Donantes (${CASES.length} filas)`);
console.log(`   - Sheet 3: Receptores+Implante (${CASES.filter(c=>c.rec).length} filas)`);
console.log(`   - Sheet 4: Postoperatorio (${CASES.filter(c=>c.po).length} filas)`);
console.log(`   - Sheet 5: Seguimiento`);
console.log(`   - Sheet 6: Alertas pendientes`);
console.log('\n   Abre el archivo con Excel o Numbers para verlo.\n');
