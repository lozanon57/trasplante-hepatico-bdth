import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq, desc, and, isNull, isNotNull } from 'drizzle-orm';
import * as schema from './schema';

const sqlite = openDatabaseSync('bdth.db');
export const db = drizzle(sqlite, { schema });

// ─────────────────────────────────────────────
// INICIALIZACIÓN — crear tablas si no existen
// ─────────────────────────────────────────────
export function initDatabase() {
  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_anon TEXT UNIQUE NOT NULL,
      nhc_hash TEXT UNIQUE NOT NULL,
      grupo_abo TEXT,
      fecha_creacion INTEGER,
      creado_por TEXT
    );

    CREATE TABLE IF NOT EXISTS trasplantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
      nhc_higado TEXT,
      fecha_trasplante INTEGER,
      estado TEXT DEFAULT 'borrador',
      num_alertas INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS donante (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trasplante_id INTEGER NOT NULL REFERENCES trasplantes(id),
      fecha INTEGER, grupo_abo TEXT,
      sexo INTEGER, edad REAL, peso_kg REAL, talla_cm REAL,
      causa_muerte TEXT, causa_uci TEXT,
      fr_hta INTEGER, fr_dm INTEGER, fr_dl INTEGER, fr_otros TEXT,
      oh INTEGER, tabaco INTEGER, drogas_va INTEGER, pcr_previa INTEGER,
      eco_tc INTEGER,
      as_na REAL, as_alt REAL, as_ast REAL, as_plaq REAL, as_ggt REAL, as_bi REAL, as_cr REAL,
      tipo_donacion TEXT,
      donacion_rinon INTEGER, donacion_corazon INTEGER, donacion_pulmon INTEGER,
      dcd_tiempo_ecmo_min REAL, twit_seg REAL, fwit_seg REAL,
      esteatosis_macros INTEGER, perfusion INTEGER,
      anomalias_arteriales INTEGER, tipo_anomalia TEXT, tipo_reconstruccion TEXT,
      biopsia INTEGER, solucion_preservacion TEXT, asociada_extraccion TEXT,
      sangre_basal_ph REAL, sangre_1h_ph REAL, sangre_1h30_ph REAL, sangre_2h_ph REAL,
      sangre_basal_lact REAL, sangre_1h_lact REAL, sangre_1h30_lact REAL, sangre_2h_lact REAL,
      sangre_basal_alt REAL, sangre_1h_alt REAL, sangre_1h30_alt REAL, sangre_2h_alt REAL,
      sangre_basal_ast REAL, sangre_1h_ast REAL, sangre_1h30_ast REAL, sangre_2h_ast REAL,
      sangre_basal_ggt REAL, sangre_1h_ggt REAL, sangre_1h30_ggt REAL, sangre_2h_ggt REAL,
      sangre_basal_bi REAL, sangre_1h_bi REAL, sangre_1h30_bi REAL, sangre_2h_bi REAL,
      sangre_basal_inr REAL, sangre_1h_inr REAL, sangre_1h30_inr REAL, sangre_2h_inr REAL,
      sangre_basal_bnp REAL, sangre_1h_bnp REAL,
      sangre_basal_trop REAL, sangre_1h_trop REAL,
      sangre_basal_dd REAL, sangre_1h_dd REAL,
      sangre_basal_molec REAL, sangre_basal_fact REAL,
      bilis_2h_ph REAL, bilis_2h_bicarb REAL, bilis_2h_lact REAL,
      bilis_2h_alt REAL, bilis_2h_ggt REAL, bilis_2h_bi REAL, bilis_2h_ast REAL,
      bilis_2h_bnp REAL, bilis_2h_trop REAL, bilis_2h_dd REAL, bilis_2h_inr REAL,
      bilis_2h_molec REAL, bilis_2h_fact REAL, bilis_2h_glu REAL,
      organos_hora_inicio INTEGER, organos_hora_fin INTEGER, organos_tiempo_min REAL,
      organos_causa TEXT, organos_validez INTEGER, organos_causa_no_validez TEXT,
      preservacion TEXT
    );

    CREATE TABLE IF NOT EXISTS receptor_implante (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trasplante_id INTEGER NOT NULL REFERENCES trasplantes(id),
      nhc_receptor TEXT,
      sexo INTEGER, edad REAL, peso_kg REAL, talla_cm REAL,
      origen_hepatopatia TEXT, chc INTEGER,
      fr_hta INTEGER, fr_dm INTEGER, fr_dl INTEGER, tabaco INTEGER, oh INTEGER,
      meld REAL, indicacion_tho TEXT,
      as_alt REAL, as_ast REAL, as_cr REAL, as_plaq REAL, as_ggt REAL, as_inr REAL, as_bi REAL,
      alerta_cero INTEGER, tecnica INTEGER, reperfusion INTEGER,
      sindrome_reperfusion INTEGER, vb_tecnica INTEGER,
      peso_injerto REAL, flujo_portal REAL, flujo_arterial REAL,
      t_isquemia_fria REAL, t_preservacion_hope REAL,
      t_isquemia_caliente REAL, t_isquemia_total REAL,
      retho INTEGER, pdr REAL,
      serie_intraop_json TEXT,
      hope_hora_inicio INTEGER, hope_hora_fin INTEGER, hope_tiempo_min REAL,
      hope_causa TEXT, hope_tipo INTEGER,
      hope_flujo REAL, hope_presion REAL, hope_po2 REAL
    );

    CREATE TABLE IF NOT EXISTS postoperatorio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trasplante_id INTEGER NOT NULL REFERENCES trasplantes(id),
      pico_alt REAL, pico_ast REAL, pico_ggt REAL,
      pico_inr REAL, pico_cr REAL, pico_plaq REAL, pico_bi REAL,
      disfuncion_olthoff_7dpo INTEGER,
      bi_mayor_10 INTEGER, inr_mayor_16 INTEGER, alt_ast_mayor_2000 INTEGER,
      serie_dpo_json TEXT,
      sangrado INTEGER, reintervencion INTEGER,
      reintervencion_fecha INTEGER, reintervencion_causa TEXT,
      fecha_alta INTEGER, dias_estancia_total INTEGER, dias_estancia_rea INTEGER,
      complicaciones_po INTEGER, clavien_dindo INTEGER,
      ead_olthoff INTEGER, pnf INTEGER, trombosis_arterial INTEGER,
      complicacion_biliar INTEGER, estenosis_biliar_no_anast INTEGER,
      fuga_biliar INTEGER, rechazo_agudo INTEGER,
      fecha_ultima_revision INTEGER, exitus_global INTEGER,
      exitus_7d INTEGER, exitus_7d_fecha INTEGER, exitus_7d_causa TEXT,
      exitus_30d INTEGER, exitus_30d_fecha INTEGER, exitus_30d_causa TEXT,
      perdida_injerto INTEGER, perdida_injerto_fecha INTEGER, causa_perdida_injerto TEXT,
      retrasplante INTEGER, retrasplante_fecha INTEGER, causa_retrasplante TEXT,
      rm_6meses INTEGER,
      colangiopatia_intrahepatica INTEGER, colangiopatia_intrahepatica_fecha INTEGER,
      colangiopatia_intrahepatica_desc TEXT,
      colangiopatia INTEGER, colangiopatia_fecha INTEGER, colangiopatia_desc TEXT,
      estenosis_anastomosis INTEGER, estenosis_anastomosis_fecha INTEGER,
      estenosis_anastomosis_desc TEXT
    );

    CREATE TABLE IF NOT EXISTS alertas_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trasplante_id INTEGER NOT NULL REFERENCES trasplantes(id),
      tipo TEXT NOT NULL,
      seccion TEXT,
      campo TEXT,
      mensaje TEXT,
      resuelta INTEGER DEFAULT 0,
      fecha INTEGER
    );
  `);
}

// ─────────────────────────────────────────────
// PACIENTES
// ─────────────────────────────────────────────
export function crearPaciente(data: schema.NuevoPaciente) {
  return db.insert(schema.pacientes).values(data).returning().get();
}

export function buscarPacientePorHash(nhc_hash: string) {
  return db.select().from(schema.pacientes).where(eq(schema.pacientes.nhc_hash, nhc_hash)).get();
}

export function buscarPacientePorCodigo(codigo: string) {
  return db.select().from(schema.pacientes).where(eq(schema.pacientes.codigo_anon, codigo)).get();
}

// ─────────────────────────────────────────────
// TRASPLANTES
// ─────────────────────────────────────────────
export function crearTrasplante(data: schema.NuevoTrasplante) {
  return db.insert(schema.trasplantes).values(data).returning().get();
}

export function listarTrasplantes() {
  return db
    .select({
      trasplante: schema.trasplantes,
      codigo_anon: schema.pacientes.codigo_anon,
      creado_por: schema.pacientes.creado_por,
    })
    .from(schema.trasplantes)
    .innerJoin(schema.pacientes, eq(schema.trasplantes.paciente_id, schema.pacientes.id))
    .orderBy(desc(schema.trasplantes.fecha_trasplante))
    .all();
}

export function obtenerTrasplante(id: number) {
  return db.select().from(schema.trasplantes).where(eq(schema.trasplantes.id, id)).get();
}

export function actualizarEstadoTrasplante(id: number, estado: string, num_alertas: number) {
  return db
    .update(schema.trasplantes)
    .set({ estado, num_alertas })
    .where(eq(schema.trasplantes.id, id))
    .run();
}

// ─────────────────────────────────────────────
// DONANTE
// ─────────────────────────────────────────────
export function guardarDonante(data: schema.NuevoDonante) {
  const existing = db
    .select()
    .from(schema.donante)
    .where(eq(schema.donante.trasplante_id, data.trasplante_id))
    .get();
  if (existing) {
    return db.update(schema.donante).set(data).where(eq(schema.donante.trasplante_id, data.trasplante_id)).returning().get();
  }
  return db.insert(schema.donante).values(data).returning().get();
}

export function obtenerDonante(trasplante_id: number) {
  return db.select().from(schema.donante).where(eq(schema.donante.trasplante_id, trasplante_id)).get();
}

// ─────────────────────────────────────────────
// RECEPTOR + IMPLANTE
// ─────────────────────────────────────────────
export function guardarReceptorImplante(data: schema.NuevoReceptorImplante) {
  const existing = db
    .select()
    .from(schema.receptorImplante)
    .where(eq(schema.receptorImplante.trasplante_id, data.trasplante_id))
    .get();
  if (existing) {
    return db.update(schema.receptorImplante).set(data).where(eq(schema.receptorImplante.trasplante_id, data.trasplante_id)).returning().get();
  }
  return db.insert(schema.receptorImplante).values(data).returning().get();
}

export function obtenerReceptorImplante(trasplante_id: number) {
  return db.select().from(schema.receptorImplante).where(eq(schema.receptorImplante.trasplante_id, trasplante_id)).get();
}

// ─────────────────────────────────────────────
// POSTOPERATORIO
// ─────────────────────────────────────────────
export function guardarPostoperatorio(data: schema.NuevoPostoperatorio) {
  const existing = db
    .select()
    .from(schema.postoperatorio)
    .where(eq(schema.postoperatorio.trasplante_id, data.trasplante_id))
    .get();
  if (existing) {
    return db.update(schema.postoperatorio).set(data).where(eq(schema.postoperatorio.trasplante_id, data.trasplante_id)).returning().get();
  }
  return db.insert(schema.postoperatorio).values(data).returning().get();
}

export function obtenerPostoperatorio(trasplante_id: number) {
  return db.select().from(schema.postoperatorio).where(eq(schema.postoperatorio.trasplante_id, trasplante_id)).get();
}

// ─────────────────────────────────────────────
// ALERTAS
// ─────────────────────────────────────────────
export function insertarAlerta(data: Omit<schema.AlertaLog, 'id'>) {
  return db.insert(schema.alertasLog).values(data).run();
}

export function borrarAlertasTrasplante(trasplante_id: number) {
  return db.delete(schema.alertasLog).where(eq(schema.alertasLog.trasplante_id, trasplante_id)).run();
}

export function obtenerAlertasPendientes(trasplante_id: number) {
  return db
    .select()
    .from(schema.alertasLog)
    .where(and(eq(schema.alertasLog.trasplante_id, trasplante_id), eq(schema.alertasLog.resuelta, 0)))
    .all();
}

export function totalAlertasCriticasPendientes() {
  return db
    .select()
    .from(schema.alertasLog)
    .where(and(eq(schema.alertasLog.tipo, 'critica'), eq(schema.alertasLog.resuelta, 0)))
    .all().length;
}

export function resolverAlerta(id: number) {
  return db.update(schema.alertasLog).set({ resuelta: 1 }).where(eq(schema.alertasLog.id, id)).run();
}

// ─────────────────────────────────────────────
// COMPLETITUD — calcular % relleno de cada sección
// ─────────────────────────────────────────────
export function calcularCompletitud(trasplante_id: number): number {
  const secciones = [
    obtenerDonante(trasplante_id),
    obtenerReceptorImplante(trasplante_id),
    obtenerPostoperatorio(trasplante_id),
  ];
  const presentes = secciones.filter(Boolean).length;
  return Math.round((presentes / 3) * 100);
}

export function clearDatabase(): void {
  sqlite.execSync(`
    DELETE FROM alertas_log;
    DELETE FROM postoperatorio;
    DELETE FROM receptor_implante;
    DELETE FROM donante;
    DELETE FROM trasplantes;
    DELETE FROM pacientes;
  `);
}
