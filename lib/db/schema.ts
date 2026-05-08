import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// ─────────────────────────────────────────────
// PACIENTES — registro anónimo
// ─────────────────────────────────────────────
export const pacientes = sqliteTable('pacientes', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  codigo_anon:    text('codigo_anon').unique().notNull(),   // "BDT-A3F92B1C"
  nhc_hash:       text('nhc_hash').unique().notNull(),      // SHA256(NHC)
  grupo_abo:      text('grupo_abo'),                        // A/B/AB/O
  fecha_creacion: integer('fecha_creacion'),
  creado_por:     text('creado_por'),
});

// ─────────────────────────────────────────────
// TRASPLANTES — cabecera del episodio
// ─────────────────────────────────────────────
export const trasplantes = sqliteTable('trasplantes', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  paciente_id:      integer('paciente_id').notNull().references(() => pacientes.id),
  nhc_higado:       text('nhc_higado'),
  fecha_trasplante: integer('fecha_trasplante'),
  estado:           text('estado').default('borrador'), // borrador|incompleto|completo
  num_alertas:      integer('num_alertas').default(0),
});

// ─────────────────────────────────────────────
// DONANTE — Página 1 formulario BDTH
// ─────────────────────────────────────────────
export const donante = sqliteTable('donante', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  trasplante_id: integer('trasplante_id').notNull().references(() => trasplantes.id),

  // IDENTIFICACIÓN
  fecha:         integer('fecha'),
  grupo_abo:     text('grupo_abo'),

  // DATOS BIOMÉTRICOS
  sexo:      integer('sexo'),   // 0=Hombre 1=Mujer
  edad:      real('edad'),
  peso_kg:   real('peso_kg'),
  talla_cm:  real('talla_cm'),

  // CAUSA MUERTE
  causa_muerte: text('causa_muerte'), // PCR/ACV/TCE/Otro
  causa_uci:    text('causa_uci'),

  // FACTORES RIESGO
  fr_hta:    integer('fr_hta'),
  fr_dm:     integer('fr_dm'),
  fr_dl:     integer('fr_dl'),
  fr_otros:  text('fr_otros'),
  oh:        integer('oh'),
  tabaco:    integer('tabaco'),
  drogas_va: integer('drogas_va'),
  pcr_previa:integer('pcr_previa'),

  // IMAGEN
  eco_tc: integer('eco_tc'), // 0=Normal 1=Est_leve 2=Est_mod 3=Otro

  // ANALÍTICA BASAL DONANTE
  as_na:   real('as_na'),
  as_alt:  real('as_alt'),
  as_ast:  real('as_ast'),
  as_plaq: real('as_plaq'),
  as_ggt:  real('as_ggt'),
  as_bi:   real('as_bi'),
  as_cr:   real('as_cr'),

  // TIPO DONACIÓN
  tipo_donacion:       text('tipo_donacion'), // DBD/DCD/DCD+ECMO/DCD_PAM
  donacion_rinon:      integer('donacion_rinon'),
  donacion_corazon:    integer('donacion_corazon'),
  donacion_pulmon:     integer('donacion_pulmon'),
  dcd_tiempo_ecmo_min: real('dcd_tiempo_ecmo_min'),
  twit_seg:            real('twit_seg'),
  fwit_seg:            real('fwit_seg'),

  // BIOPSIA / EXTRACCIÓN
  esteatosis_macros:    integer('esteatosis_macros'),
  perfusion:            integer('perfusion'), // 0=Buena 1=Regular 2=Mala
  anomalias_arteriales: integer('anomalias_arteriales'),
  tipo_anomalia:        text('tipo_anomalia'),
  tipo_reconstruccion:  text('tipo_reconstruccion'),
  biopsia:              integer('biopsia'),
  solucion_preservacion:text('solucion_preservacion'),
  asociada_extraccion:  text('asociada_extraccion'),

  // ANALÍTICAS SERIE TEMPORAL — SANGRE
  sangre_basal_ph:   real('sangre_basal_ph'),   sangre_1h_ph:   real('sangre_1h_ph'),   sangre_1h30_ph:  real('sangre_1h30_ph'),   sangre_2h_ph:   real('sangre_2h_ph'),
  sangre_basal_lact: real('sangre_basal_lact'), sangre_1h_lact: real('sangre_1h_lact'), sangre_1h30_lact:real('sangre_1h30_lact'), sangre_2h_lact: real('sangre_2h_lact'),
  sangre_basal_alt:  real('sangre_basal_alt'),  sangre_1h_alt:  real('sangre_1h_alt'),  sangre_1h30_alt: real('sangre_1h30_alt'),  sangre_2h_alt:  real('sangre_2h_alt'),
  sangre_basal_ast:  real('sangre_basal_ast'),  sangre_1h_ast:  real('sangre_1h_ast'),  sangre_1h30_ast: real('sangre_1h30_ast'),  sangre_2h_ast:  real('sangre_2h_ast'),
  sangre_basal_ggt:  real('sangre_basal_ggt'),  sangre_1h_ggt:  real('sangre_1h_ggt'),  sangre_1h30_ggt: real('sangre_1h30_ggt'),  sangre_2h_ggt:  real('sangre_2h_ggt'),
  sangre_basal_bi:   real('sangre_basal_bi'),   sangre_1h_bi:   real('sangre_1h_bi'),   sangre_1h30_bi:  real('sangre_1h30_bi'),   sangre_2h_bi:   real('sangre_2h_bi'),
  sangre_basal_inr:  real('sangre_basal_inr'),  sangre_1h_inr:  real('sangre_1h_inr'),  sangre_1h30_inr: real('sangre_1h30_inr'),  sangre_2h_inr:  real('sangre_2h_inr'),
  sangre_basal_bnp:  real('sangre_basal_bnp'),  sangre_1h_bnp:  real('sangre_1h_bnp'),
  sangre_basal_trop: real('sangre_basal_trop'), sangre_1h_trop: real('sangre_1h_trop'),
  sangre_basal_dd:   real('sangre_basal_dd'),   sangre_1h_dd:   real('sangre_1h_dd'),
  sangre_basal_molec:real('sangre_basal_molec'),
  sangre_basal_fact: real('sangre_basal_fact'),

  // ANALÍTICAS BILIS (+2H)
  bilis_2h_ph:    real('bilis_2h_ph'),
  bilis_2h_bicarb:real('bilis_2h_bicarb'),
  bilis_2h_lact:  real('bilis_2h_lact'),
  bilis_2h_alt:   real('bilis_2h_alt'),
  bilis_2h_ggt:   real('bilis_2h_ggt'),
  bilis_2h_bi:    real('bilis_2h_bi'),
  bilis_2h_ast:   real('bilis_2h_ast'),
  bilis_2h_bnp:   real('bilis_2h_bnp'),
  bilis_2h_trop:  real('bilis_2h_trop'),
  bilis_2h_dd:    real('bilis_2h_dd'),
  bilis_2h_inr:   real('bilis_2h_inr'),
  bilis_2h_molec: real('bilis_2h_molec'),
  bilis_2h_fact:  real('bilis_2h_fact'),
  bilis_2h_glu:   real('bilis_2h_glu'),

  // PERFUSIÓN NORMOTÉRMICA — ORGANOX
  organos_hora_inicio:      integer('organos_hora_inicio'),
  organos_hora_fin:         integer('organos_hora_fin'),
  organos_tiempo_min:       real('organos_tiempo_min'),
  organos_causa:            text('organos_causa'),
  organos_validez:          integer('organos_validez'),
  organos_causa_no_validez: text('organos_causa_no_validez'),
  preservacion:             text('preservacion'), // SCS/SCS+HOPE/SCS+Organox
});

// ─────────────────────────────────────────────
// RECEPTOR + IMPLANTE — Página 2
// ─────────────────────────────────────────────
export const receptorImplante = sqliteTable('receptor_implante', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  trasplante_id: integer('trasplante_id').notNull().references(() => trasplantes.id),

  // DATOS RECEPTOR
  nhc_receptor:        text('nhc_receptor'),
  sexo:                integer('sexo'),
  edad:                real('edad'),
  peso_kg:             real('peso_kg'),
  talla_cm:            real('talla_cm'),
  origen_hepatopatia:  text('origen_hepatopatia'),
  chc:                 integer('chc'),
  fr_hta:              integer('fr_hta'),
  fr_dm:               integer('fr_dm'),
  fr_dl:               integer('fr_dl'),
  tabaco:              integer('tabaco'),
  oh:                  integer('oh'),
  meld:                real('meld'),
  indicacion_tho:      text('indicacion_tho'),

  // AS BASAL RECEPTOR
  as_alt:  real('as_alt'),
  as_ast:  real('as_ast'),
  as_cr:   real('as_cr'),
  as_plaq: real('as_plaq'),
  as_ggt:  real('as_ggt'),
  as_inr:  real('as_inr'),
  as_bi:   real('as_bi'),

  // DATOS IMPLANTE
  alerta_cero:          integer('alerta_cero'),
  tecnica:              integer('tecnica'),           // 0=Piggyback 1=Clásica
  reperfusion:          integer('reperfusion'),       // 0=Buena 1=Regular 2=Mala
  sindrome_reperfusion: integer('sindrome_reperfusion'), // 0=No/1=Leve/2=Mod/3=Grave
  vb_tecnica:           integer('vb_tecnica'),        // 0=Colédoco-colédoco 1=Hep-yeyuno
  peso_injerto:         real('peso_injerto'),
  flujo_portal:         real('flujo_portal'),
  flujo_arterial:       real('flujo_arterial'),
  t_isquemia_fria:      real('t_isquemia_fria'),
  t_preservacion_hope:  real('t_preservacion_hope'),
  t_isquemia_caliente:  real('t_isquemia_caliente'),
  t_isquemia_total:     real('t_isquemia_total'),
  retho:                integer('retho'),
  pdr:                  real('pdr'),

  // SERIE INTRAOPERATORIA — JSON array
  serie_intraop_json: text('serie_intraop_json'),

  // PERFUSIÓN HIPOTÉRMICA — HOPE
  hope_hora_inicio: integer('hope_hora_inicio'),
  hope_hora_fin:    integer('hope_hora_fin'),
  hope_tiempo_min:  real('hope_tiempo_min'),
  hope_causa:       text('hope_causa'),
  hope_tipo:        integer('hope_tipo'), // 0=Single 1=Dual
  hope_flujo:       real('hope_flujo'),
  hope_presion:     real('hope_presion'),
  hope_po2:         real('hope_po2'),
});

// ─────────────────────────────────────────────
// POSTOPERATORIO — Página 3
// ─────────────────────────────────────────────
export const postoperatorio = sqliteTable('postoperatorio', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  trasplante_id: integer('trasplante_id').notNull().references(() => trasplantes.id),

  // AS PICO RECEPTOR 7 DÍAS
  pico_alt:  real('pico_alt'),
  pico_ast:  real('pico_ast'),
  pico_ggt:  real('pico_ggt'),
  pico_inr:  real('pico_inr'),
  pico_cr:   real('pico_cr'),
  pico_plaq: real('pico_plaq'),
  pico_bi:   real('pico_bi'),

  // DISFUNCIÓN PRIMARIA (Olthoff)
  disfuncion_olthoff_7dpo: integer('disfuncion_olthoff_7dpo'),
  bi_mayor_10:             integer('bi_mayor_10'),
  inr_mayor_16:            integer('inr_mayor_16'),
  alt_ast_mayor_2000:      integer('alt_ast_mayor_2000'),

  // SERIE DPO — JSON array [{dia, bi, inr, alt, ast, ggt, fa, crea}]
  serie_dpo_json: text('serie_dpo_json'),

  // COMPLICACIONES QUIRÚRGICAS
  sangrado:              integer('sangrado'),
  reintervencion:        integer('reintervencion'),
  reintervencion_fecha:  integer('reintervencion_fecha'),
  reintervencion_causa:  text('reintervencion_causa'),

  // ALTA HOSPITALARIA
  fecha_alta:           integer('fecha_alta'),
  dias_estancia_total:  integer('dias_estancia_total'),
  dias_estancia_rea:    integer('dias_estancia_rea'),

  // COMPLICACIONES PO
  complicaciones_po:         integer('complicaciones_po'),
  clavien_dindo:             integer('clavien_dindo'), // 0-6
  ead_olthoff:               integer('ead_olthoff'),
  pnf:                       integer('pnf'),
  trombosis_arterial:        integer('trombosis_arterial'),
  complicacion_biliar:       integer('complicacion_biliar'),
  estenosis_biliar_no_anast: integer('estenosis_biliar_no_anast'),
  fuga_biliar:               integer('fuga_biliar'),
  rechazo_agudo:             integer('rechazo_agudo'),

  // SEGUIMIENTO A LARGO PLAZO
  fecha_ultima_revision:           integer('fecha_ultima_revision'),
  exitus_global:                   integer('exitus_global'),
  exitus_7d:                       integer('exitus_7d'),
  exitus_7d_fecha:                 integer('exitus_7d_fecha'),
  exitus_7d_causa:                 text('exitus_7d_causa'),
  exitus_30d:                      integer('exitus_30d'),
  exitus_30d_fecha:                integer('exitus_30d_fecha'),
  exitus_30d_causa:                text('exitus_30d_causa'),
  perdida_injerto:                 integer('perdida_injerto'),
  perdida_injerto_fecha:           integer('perdida_injerto_fecha'),
  causa_perdida_injerto:           text('causa_perdida_injerto'),
  retrasplante:                    integer('retrasplante'),
  retrasplante_fecha:              integer('retrasplante_fecha'),
  causa_retrasplante:              text('causa_retrasplante'),
  rm_6meses:                       integer('rm_6meses'),
  colangiopatia_intrahepatica:     integer('colangiopatia_intrahepatica'),
  colangiopatia_intrahepatica_fecha:integer('colangiopatia_intrahepatica_fecha'),
  colangiopatia_intrahepatica_desc: text('colangiopatia_intrahepatica_desc'),
  colangiopatia:                   integer('colangiopatia'),
  colangiopatia_fecha:             integer('colangiopatia_fecha'),
  colangiopatia_desc:              text('colangiopatia_desc'),
  estenosis_anastomosis:           integer('estenosis_anastomosis'),
  estenosis_anastomosis_fecha:     integer('estenosis_anastomosis_fecha'),
  estenosis_anastomosis_desc:      text('estenosis_anastomosis_desc'),
});

// ─────────────────────────────────────────────
// ALERTAS LOG
// ─────────────────────────────────────────────
export const alertasLog = sqliteTable('alertas_log', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  trasplante_id: integer('trasplante_id').notNull().references(() => trasplantes.id),
  tipo:          text('tipo').notNull(), // campo_vacio|seguimiento_pendiente|critica
  seccion:       text('seccion'),        // donante|implante|postoperatorio
  campo:         text('campo'),
  mensaje:       text('mensaje'),
  resuelta:      integer('resuelta').default(0),
  fecha:         integer('fecha'),
});

// ─────────────────────────────────────────────
// TIPOS EXPORTADOS
// ─────────────────────────────────────────────
export type Paciente = typeof pacientes.$inferSelect;
export type NuevoPaciente = typeof pacientes.$inferInsert;
export type Trasplante = typeof trasplantes.$inferSelect;
export type NuevoTrasplante = typeof trasplantes.$inferInsert;
export type Donante = typeof donante.$inferSelect;
export type NuevoDonante = typeof donante.$inferInsert;
export type ReceptorImplante = typeof receptorImplante.$inferSelect;
export type NuevoReceptorImplante = typeof receptorImplante.$inferInsert;
export type Postoperatorio = typeof postoperatorio.$inferSelect;
export type NuevoPostoperatorio = typeof postoperatorio.$inferInsert;
export type AlertaLog = typeof alertasLog.$inferSelect;
