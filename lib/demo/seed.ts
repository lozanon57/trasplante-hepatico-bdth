import {
  clearDatabase,
  crearPaciente, crearTrasplante,
  guardarDonante, guardarReceptorImplante, guardarPostoperatorio,
  listarTrasplantes,
} from '../db/queries';

// Always clears and re-seeds — safe to call multiple times
export function seedDemoData(): number {
  clearDatabase();

  const now = Date.now();
  // Spread 22 transplants over the last 16 months (so ~12 fall in last-12-months chart)
  function daysAgo(d: number) { return now - d * 86_400_000; }

  const CIRUJANOS = ['García Pérez','López Martínez','Rodríguez Sánchez','Fernández Ruiz','Martínez López'];
  const cir = (i: number) => CIRUJANOS[i % CIRUJANOS.length]!;

  // ── 22 cases: indices 0-17 complete, 18-21 donor-only (rejected) ──────────
  const CASES: {
    ts: number;
    // Donor
    dSexo: number; dEdad: number; dPeso: number; dTalla: number;
    dCausa: string; dTipo: 'DBD'|'DCD'|'HOPE'; dAbo: string;
    dHta: number; dDm: number; dEst: number; dPerf: number;
    dTwit: number; dFwit: number; dNa: number; dAlt: number; dCr: number;
    // Receptor (undefined = rejected donor)
    rSexo?: number; rEdad?: number; rPeso?: number; rTalla?: number;
    rHep?: string; rChc?: number; rMeld?: number; rAbo?: string;
    rAlt?: number; rInr?: number; rBi?: number;
    tif?: number; tih?: number; tecnica?: number;
    // Postop (undefined = rejected donor)
    ead?: number; pnf?: number; trombosis?: number; bil?: number;
    rechazo?: number; reinterv?: number; clavien?: number;
    dias?: number; rea?: number; exitus7?: number; exitus30?: number;
    pAlt?: number; pAst?: number;
  }[] = [
    // ── 0 — VHC + CHC, DBD, MELD 22, TIF 385 ─────────────────────────────
    { ts: daysAgo(14),
      dSexo:0, dEdad:52, dPeso:78, dTalla:172, dCausa:'TCE',   dTipo:'DBD',  dAbo:'A', dHta:1, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:140, dAlt:42, dCr:0.9,
      rSexo:0, rEdad:58, rPeso:74, rTalla:170, rHep:'Cirrosis VHC + CHC', rChc:1, rMeld:22, rAbo:'A', rAlt:95, rInr:1.4, rBi:3.2,
      tif:385, tih:44, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:11, rea:3, exitus7:0, exitus30:0, pAlt:820, pAst:980 },

    // ── 1 — Alcohólica, DBD, MELD 18, TIF 420 ────────────────────────────
    { ts: daysAgo(28),
      dSexo:1, dEdad:45, dPeso:62, dTalla:162, dCausa:'HIC',   dTipo:'DBD',  dAbo:'O', dHta:1, dDm:1, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:138, dAlt:55, dCr:1.1,
      rSexo:1, rEdad:52, rPeso:60, rTalla:162, rHep:'Cirrosis alcohólica', rChc:0, rMeld:18, rAbo:'O', rAlt:180, rInr:1.6, rBi:4.8,
      tif:420, tih:50, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:10, rea:2, exitus7:0, exitus30:0, pAlt:650, pAst:720 },

    // ── 2 — CHC alcohólico, DCD, MELD 28, TIF 490 — EAD ─────────────────
    { ts: daysAgo(44),
      dSexo:0, dEdad:60, dPeso:85, dTalla:176, dCausa:'ACV',   dTipo:'DCD',  dAbo:'B', dHta:1, dDm:0, dEst:1, dPerf:1, dTwit:1200, dFwit:240, dNa:137, dAlt:88, dCr:1.3,
      rSexo:0, rEdad:61, rPeso:80, rTalla:175, rHep:'CHC sobre cirrosis alcohólica', rChc:1, rMeld:28, rAbo:'B', rAlt:220, rInr:1.9, rBi:6.1,
      tif:490, tih:42, tecnica:1,
      ead:1, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:1, clavien:3, dias:22, rea:6, exitus7:0, exitus30:0, pAlt:2800, pAst:3100 },

    // ── 3 — Fallo agudo, HOPE, MELD 35, TIF 295 ──────────────────────────
    { ts: daysAgo(58),
      dSexo:1, dEdad:38, dPeso:58, dTalla:158, dCausa:'Anoxia', dTipo:'HOPE', dAbo:'A', dHta:0, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:142, dAlt:30, dCr:0.8,
      rSexo:1, rEdad:45, rPeso:55, rTalla:158, rHep:'Fallo hepático agudo', rChc:0, rMeld:35, rAbo:'A', rAlt:1200, rInr:2.8, rBi:12.4,
      tif:295, tih:38, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:8, rea:2, exitus7:0, exitus30:0, pAlt:980, pAst:1100 },

    // ── 4 — VHB + CHC, DBD, MELD 24, TIF 350 ────────────────────────────
    { ts: daysAgo(71),
      dSexo:0, dEdad:55, dPeso:90, dTalla:180, dCausa:'TCE',   dTipo:'DBD',  dAbo:'AB', dHta:0, dDm:1, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:141, dAlt:48, dCr:1.0,
      rSexo:0, rEdad:55, rPeso:82, rTalla:178, rHep:'Cirrosis VHB + CHC', rChc:1, rMeld:24, rAbo:'AB', rAlt:140, rInr:1.5, rBi:3.8,
      tif:350, tih:40, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:11, rea:3, exitus7:0, exitus30:0, pAlt:740, pAst:810 },

    // ── 5 — PSC, DBD, MELD 20, TIF 440 — complicación biliar ─────────────
    { ts: daysAgo(89),
      dSexo:1, dEdad:49, dPeso:68, dTalla:165, dCausa:'HIC',   dTipo:'DBD',  dAbo:'O', dHta:1, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:139, dAlt:60, dCr:0.9,
      rSexo:1, rEdad:48, rPeso:58, rTalla:163, rHep:'Colangitis esclerosante primaria (PSC)', rChc:0, rMeld:20, rAbo:'O', rAlt:280, rInr:1.7, rBi:8.2,
      tif:440, tih:55, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:1, rechazo:0, reinterv:1, clavien:3, dias:24, rea:5, exitus7:0, exitus30:0, pAlt:560, pAst:620 },

    // ── 6 — NASH + CHC, DCD, MELD 32, TIF 510 — EAD + rechazo ───────────
    { ts: daysAgo(103),
      dSexo:0, dEdad:63, dPeso:88, dTalla:174, dCausa:'ACV',   dTipo:'DCD',  dAbo:'A', dHta:1, dDm:1, dEst:1, dPerf:1, dTwit:1080, dFwit:200, dNa:136, dAlt:95, dCr:1.5,
      rSexo:0, rEdad:63, rPeso:86, rTalla:174, rHep:'Cirrosis metabólica (NASH) + CHC', rChc:1, rMeld:32, rAbo:'A', rAlt:310, rInr:2.1, rBi:7.9,
      tif:510, tih:48, tecnica:1,
      ead:1, pnf:0, trombosis:0, bil:0, rechazo:1, reinterv:1, clavien:4, dias:32, rea:9, exitus7:0, exitus30:0, pAlt:3200, pAst:3600 },

    // ── 7 — Fallo agudo Wilson, HOPE, MELD 38, TIF 285 ───────────────────
    { ts: daysAgo(118),
      dSexo:1, dEdad:41, dPeso:55, dTalla:160, dCausa:'TCE',   dTipo:'HOPE', dAbo:'B', dHta:0, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:143, dAlt:35, dCr:0.7,
      rSexo:1, rEdad:40, rPeso:53, rTalla:160, rHep:'Enfermedad de Wilson — fallo agudo', rChc:0, rMeld:38, rAbo:'B', rAlt:980, rInr:3.2, rBi:18.6,
      tif:285, tih:35, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:7, rea:2, exitus7:0, exitus30:0, pAlt:1400, pAst:1600 },

    // ── 8 — VHC recurrente, DBD, MELD 26, TIF 395 ────────────────────────
    { ts: daysAgo(132),
      dSexo:0, dEdad:57, dPeso:82, dTalla:178, dCausa:'HIC',   dTipo:'DBD',  dAbo:'O', dHta:1, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:140, dAlt:50, dCr:1.0,
      rSexo:0, rEdad:57, rPeso:78, rTalla:177, rHep:'Cirrosis VHC', rChc:1, rMeld:26, rAbo:'O', rAlt:160, rInr:1.6, rBi:4.5,
      tif:395, tih:44, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:13, rea:3, exitus7:0, exitus30:0, pAlt:880, pAst:960 },

    // ── 9 — CBP, DBD, MELD 16, TIF 330 ──────────────────────────────────
    { ts: daysAgo(148),
      dSexo:1, dEdad:44, dPeso:64, dTalla:164, dCausa:'Anoxia', dTipo:'DBD', dAbo:'A', dHta:0, dDm:1, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:139, dAlt:45, dCr:0.9,
      rSexo:1, rEdad:44, rPeso:62, rTalla:164, rHep:'Cirrosis biliar primaria (CBP)', rChc:0, rMeld:16, rAbo:'A', rAlt:90, rInr:1.3, rBi:2.8,
      tif:330, tih:40, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:9, rea:2, exitus7:0, exitus30:0, pAlt:520, pAst:580 },

    // ── 10 — Alcohólica, DCD, MELD 30, TIF 470 — trombosis arterial ──────
    { ts: daysAgo(162),
      dSexo:0, dEdad:65, dPeso:88, dTalla:173, dCausa:'ACV',   dTipo:'DCD',  dAbo:'O', dHta:1, dDm:1, dEst:0, dPerf:0, dTwit:950,  dFwit:180, dNa:137, dAlt:82, dCr:1.2,
      rSexo:0, rEdad:65, rPeso:88, rTalla:173, rHep:'Cirrosis alcohólica', rChc:0, rMeld:30, rAbo:'O', rAlt:240, rInr:2.0, rBi:6.8,
      tif:470, tih:52, tecnica:1,
      ead:0, pnf:0, trombosis:1, bil:0, rechazo:0, reinterv:1, clavien:3, dias:28, rea:7, exitus7:0, exitus30:0, pAlt:1200, pAst:1400 },

    // ── 11 — Budd-Chiari, HOPE, MELD 34, TIF 310 ─────────────────────────
    { ts: daysAgo(178),
      dSexo:1, dEdad:35, dPeso:57, dTalla:163, dCausa:'TCE',   dTipo:'HOPE', dAbo:'AB', dHta:0, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:142, dAlt:28, dCr:0.8,
      rSexo:1, rEdad:36, rPeso:54, rTalla:159, rHep:'Síndrome de Budd-Chiari', rChc:0, rMeld:34, rAbo:'AB', rAlt:620, rInr:2.5, rBi:14.2,
      tif:310, tih:37, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:6, rea:1, exitus7:0, exitus30:0, pAlt:760, pAst:840 },

    // ── 12 — CHC VHC, DBD, MELD 22, TIF 360 — rechazo agudo ─────────────
    { ts: daysAgo(195),
      dSexo:0, dEdad:51, dPeso:76, dTalla:170, dCausa:'HIC',   dTipo:'DBD',  dAbo:'A', dHta:1, dDm:0, dEst:1, dPerf:1, dTwit:0,    dFwit:0,   dNa:138, dAlt:70, dCr:1.1,
      rSexo:0, rEdad:50, rPeso:76, rTalla:171, rHep:'CHC sobre cirrosis VHC', rChc:1, rMeld:22, rAbo:'A', rAlt:130, rInr:1.5, rBi:3.6,
      tif:360, tih:43, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:1, reinterv:0, clavien:2, dias:16, rea:4, exitus7:0, exitus30:0, pAlt:680, pAst:750 },

    // ── 13 — Criptogénica, DBD, MELD 27, TIF 430 ─────────────────────────
    { ts: daysAgo(210),
      dSexo:1, dEdad:47, dPeso:60, dTalla:162, dCausa:'ACV',   dTipo:'DBD',  dAbo:'O', dHta:1, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:139, dAlt:58, dCr:1.0,
      rSexo:1, rEdad:46, rPeso:59, rTalla:162, rHep:'Cirrosis criptogénica', rChc:0, rMeld:27, rAbo:'O', rAlt:200, rInr:1.8, rBi:5.4,
      tif:430, tih:49, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:1, rechazo:0, reinterv:0, clavien:2, dias:15, rea:4, exitus7:0, exitus30:0, pAlt:580, pAst:640 },

    // ── 14 — NASH, DCD, MELD 29, TIF 540 — PNF + éxitus 30d ─────────────
    { ts: daysAgo(228),
      dSexo:0, dEdad:59, dPeso:83, dTalla:176, dCausa:'TCE',   dTipo:'DCD',  dAbo:'B', dHta:0, dDm:1, dEst:0, dPerf:0, dTwit:1320, dFwit:260, dNa:135, dAlt:110, dCr:1.6,
      rSexo:0, rEdad:59, rPeso:83, rTalla:176, rHep:'Cirrosis metabólica (NASH)', rChc:0, rMeld:29, rAbo:'B', rAlt:290, rInr:2.0, rBi:7.2,
      tif:540, tih:58, tecnica:1,
      ead:1, pnf:1, trombosis:0, bil:0, rechazo:0, reinterv:1, clavien:5, dias:48, rea:14, exitus7:0, exitus30:1, pAlt:4100, pAst:4600 },

    // ── 15 — Fallo agudo tóxico, HOPE, MELD 36, TIF 295 ─────────────────
    { ts: daysAgo(245),
      dSexo:1, dEdad:42, dPeso:61, dTalla:162, dCausa:'Anoxia', dTipo:'HOPE', dAbo:'A', dHta:0, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:141, dAlt:32, dCr:0.7,
      rSexo:1, rEdad:41, rPeso:57, rTalla:161, rHep:'Fallo hepático agudo — tóxico', rChc:0, rMeld:36, rAbo:'A', rAlt:1800, rInr:3.8, rBi:22.0,
      tif:295, tih:36, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:8, rea:2, exitus7:0, exitus30:0, pAlt:1100, pAst:1240 },

    // ── 16 — VHC + CHC, DBD, MELD 23, TIF 370 ───────────────────────────
    { ts: daysAgo(265),
      dSexo:0, dEdad:53, dPeso:79, dTalla:173, dCausa:'HIC',   dTipo:'DBD',  dAbo:'O', dHta:1, dDm:1, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:140, dAlt:52, dCr:1.0,
      rSexo:0, rEdad:54, rPeso:81, rTalla:174, rHep:'Cirrosis VHC + CHC', rChc:1, rMeld:23, rAbo:'O', rAlt:148, rInr:1.5, rBi:3.9,
      tif:370, tih:44, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:12, rea:3, exitus7:0, exitus30:0, pAlt:720, pAst:800 },

    // ── 17 — Alfa-1, DBD, MELD 19, TIF 340 ──────────────────────────────
    { ts: daysAgo(285),
      dSexo:1, dEdad:39, dPeso:56, dTalla:157, dCausa:'ACV',   dTipo:'DBD',  dAbo:'A', dHta:0, dDm:0, dEst:0, dPerf:0, dTwit:0,    dFwit:0,   dNa:140, dAlt:40, dCr:0.9,
      rSexo:1, rEdad:38, rPeso:55, rTalla:157, rHep:'Déficit de alfa-1-antitripsina', rChc:0, rMeld:19, rAbo:'A', rAlt:110, rInr:1.4, rBi:3.1,
      tif:340, tih:41, tecnica:0,
      ead:0, pnf:0, trombosis:0, bil:0, rechazo:0, reinterv:0, clavien:0, dias:9, rea:2, exitus7:0, exitus30:0, pAlt:490, pAst:540 },

    // ── 18-21 — Donantes NO válidos ───────────────────────────────────────
    { ts: daysAgo(55),
      dSexo:0, dEdad:72, dPeso:95, dTalla:169, dCausa:'ACV',   dTipo:'DBD',  dAbo:'O', dHta:1, dDm:1, dEst:1, dPerf:2, dTwit:0, dFwit:0, dNa:144, dAlt:220, dCr:2.1 },
    { ts: daysAgo(110),
      dSexo:1, dEdad:68, dPeso:88, dTalla:158, dCausa:'TCE',   dTipo:'DBD',  dAbo:'A', dHta:1, dDm:1, dEst:1, dPerf:2, dTwit:0, dFwit:0, dNa:145, dAlt:310, dCr:1.8 },
    { ts: daysAgo(188),
      dSexo:0, dEdad:75, dPeso:102, dTalla:171, dCausa:'HIC',  dTipo:'DBD',  dAbo:'B', dHta:1, dDm:1, dEst:1, dPerf:2, dTwit:0, dFwit:0, dNa:146, dAlt:280, dCr:2.4 },
    { ts: daysAgo(252),
      dSexo:1, dEdad:70, dPeso:91, dTalla:160, dCausa:'ACV',   dTipo:'DCD',  dAbo:'O', dHta:1, dDm:1, dEst:1, dPerf:2, dTwit:0, dFwit:0, dNa:143, dAlt:195, dCr:2.0 },
  ];

  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i]!;
    const isRejected = i >= 18;

    const paciente = crearPaciente({
      codigo_anon:    `BDT-DEMO${String(i + 1).padStart(2, '0')}`,
      nhc_hash:       `hash_demo_${i}`,
      grupo_abo:      c.dAbo,
      fecha_creacion: c.ts,
      creado_por:     cir(i),
    });

    const trasplante = crearTrasplante({
      paciente_id:      paciente.id,
      nhc_higado:       isRejected ? null : `HIG-${20000 + i}`,
      fecha_trasplante: c.ts,
      estado:           isRejected ? 'donante-no-válido' : 'completo',
      num_alertas:      0,
    });

    guardarDonante({
      trasplante_id:   trasplante.id,
      fecha:           c.ts,
      grupo_abo:       c.dAbo,
      sexo:            c.dSexo,
      edad:            c.dEdad,
      peso_kg:         c.dPeso,
      talla_cm:        c.dTalla,
      causa_muerte:    c.dCausa,
      fr_hta:          c.dHta,
      fr_dm:           c.dDm,
      esteatosis_macros: c.dEst,
      perfusion:       c.dPerf,
      tipo_donacion:   c.dTipo,
      twit_seg:        c.dTwit || null,
      fwit_seg:        c.dFwit || null,
      as_na:           c.dNa,
      as_alt:          c.dAlt,
      as_cr:           c.dCr,
      preservacion:    c.dTipo === 'HOPE' ? 'UW+HOPE' : c.dTipo === 'DCD' ? 'IGL-1' : 'IGL-1',
    });

    if (isRejected) continue;

    guardarReceptorImplante({
      trasplante_id:     trasplante.id,
      sexo:              c.rSexo!,
      edad:              c.rEdad!,
      peso_kg:           c.rPeso!,
      talla_cm:          c.rTalla!,
      origen_hepatopatia: c.rHep!,
      chc:               c.rChc!,
      meld:              c.rMeld!,
      as_alt:            c.rAlt!,
      as_inr:            c.rInr!,
      as_bi:             c.rBi!,
      tecnica:           c.tecnica!,
      t_isquemia_fria:   c.tif!,
      t_isquemia_caliente: c.tih!,
      t_isquemia_total:  c.tif! + c.tih!,
      t_preservacion_hope: c.dTipo === 'HOPE' ? 240 + (i * 30) % 120 : null,
      peso_injerto:      1100 + (i * 60) % 450,
      retho:             0,
    });

    const altaTs = c.ts + (c.dias! * 86_400_000);
    guardarPostoperatorio({
      trasplante_id:          trasplante.id,
      pico_alt:               c.pAlt!,
      pico_ast:               c.pAst!,
      ead_olthoff:            c.ead!,
      disfuncion_olthoff_7dpo: c.ead!,
      pnf:                    c.pnf!,
      trombosis_arterial:     c.trombosis!,
      complicacion_biliar:    c.bil!,
      rechazo_agudo:          c.rechazo!,
      reintervencion:         c.reinterv!,
      complicaciones_po:      (c.clavien! > 0) ? 1 : 0,
      clavien_dindo:          c.clavien!,
      dias_estancia_total:    c.dias!,
      dias_estancia_rea:      c.rea!,
      exitus_7d:              c.exitus7!,
      exitus_30d:             c.exitus30!,
      exitus_global:          c.exitus30!,
      fecha_alta:             altaTs,
      fecha_ultima_revision:  altaTs + 90 * 86_400_000,
    });
  }

  return listarTrasplantes().length;
}
