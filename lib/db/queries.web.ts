// Web implementation — mirrors the synchronous Drizzle API using localStorage

// ── Storage helpers ────────────────────────────────────────────────────────────

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
}
function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}
function nextId<T extends { id: number }>(arr: T[]): number {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

// ── Table shapes (matching schema.ts) ─────────────────────────────────────────

type Paciente = {
  id: number; codigo_anon: string; nhc_hash: string;
  grupo_abo: string | null; fecha_creacion: number | null; creado_por: string | null;
};
type Trasplante = {
  id: number; paciente_id: number; nhc_higado: string | null;
  fecha_trasplante: number | null; estado: string | null; num_alertas: number | null;
};
type AlertaLog = {
  id: number; trasplante_id: number; tipo: string; seccion: string | null;
  campo: string | null; mensaje: string | null; resuelta: number; fecha: number | null;
};

// ── Init (no-op on web) ────────────────────────────────────────────────────────

export function initDatabase(): void {}

// ── Pacientes ──────────────────────────────────────────────────────────────────

export function crearPaciente(data: Omit<Paciente, 'id'>): Paciente {
  const pacs = load<Paciente>('bdth_p');
  const pac: Paciente = { id: nextId(pacs), ...data };
  save('bdth_p', [...pacs, pac]);
  return pac;
}

export function buscarPacientePorHash(nhc_hash: string): Paciente | undefined {
  return load<Paciente>('bdth_p').find(p => p.nhc_hash === nhc_hash);
}

export function buscarPacientePorCodigo(codigo: string): Paciente | undefined {
  return load<Paciente>('bdth_p').find(p => p.codigo_anon === codigo);
}

// ── Trasplantes ────────────────────────────────────────────────────────────────

export function crearTrasplante(data: Omit<Trasplante, 'id'>): Trasplante {
  const tras = load<Trasplante>('bdth_t');
  const t: Trasplante = { id: nextId(tras), ...data };
  save('bdth_t', [...tras, t]);
  return t;
}

export function listarTrasplantes(): { trasplante: Trasplante; codigo_anon: string; creado_por: string | null }[] {
  const pacs = load<Paciente>('bdth_p');
  const tras = load<Trasplante>('bdth_t').slice().reverse();
  return tras.map(t => {
    const p = pacs.find(p => p.id === t.paciente_id)!;
    return { trasplante: t, codigo_anon: p?.codigo_anon ?? '—', creado_por: p?.creado_por ?? null };
  });
}

export function obtenerTrasplante(id: number): Trasplante | undefined {
  return load<Trasplante>('bdth_t').find(t => t.id === id);
}

export function actualizarEstadoTrasplante(id: number, estado: string, num_alertas: number): void {
  const tras = load<Trasplante>('bdth_t').map(t =>
    t.id === id ? { ...t, estado, num_alertas } : t
  );
  save('bdth_t', tras);
}

// ── Donante ────────────────────────────────────────────────────────────────────

export function guardarDonante(data: Record<string, unknown>): Record<string, unknown> {
  const arr = load<Record<string, unknown>>('bdth_d');
  const existing = arr.findIndex(d => d.trasplante_id === data.trasplante_id);
  const record = { id: existing >= 0 ? arr[existing].id as number : nextId(arr as any[]), ...data };
  if (existing >= 0) arr[existing] = record; else arr.push(record);
  save('bdth_d', arr);
  return record;
}

export function obtenerDonante(trasplante_id: number): Record<string, unknown> | undefined {
  return load<Record<string, unknown>>('bdth_d').find(d => d.trasplante_id === trasplante_id);
}

// ── Receptor + Implante ────────────────────────────────────────────────────────

export function guardarReceptorImplante(data: Record<string, unknown>): Record<string, unknown> {
  const arr = load<Record<string, unknown>>('bdth_i');
  const existing = arr.findIndex(d => d.trasplante_id === data.trasplante_id);
  const record = { id: existing >= 0 ? arr[existing].id as number : nextId(arr as any[]), ...data };
  if (existing >= 0) arr[existing] = record; else arr.push(record);
  save('bdth_i', arr);
  return record;
}

export function obtenerReceptorImplante(trasplante_id: number): Record<string, unknown> | undefined {
  return load<Record<string, unknown>>('bdth_i').find(d => d.trasplante_id === trasplante_id);
}

// ── Postoperatorio ─────────────────────────────────────────────────────────────

export function guardarPostoperatorio(data: Record<string, unknown>): Record<string, unknown> {
  const arr = load<Record<string, unknown>>('bdth_po');
  const existing = arr.findIndex(d => d.trasplante_id === data.trasplante_id);
  const record = { id: existing >= 0 ? arr[existing].id as number : nextId(arr as any[]), ...data };
  if (existing >= 0) arr[existing] = record; else arr.push(record);
  save('bdth_po', arr);
  return record;
}

export function obtenerPostoperatorio(trasplante_id: number): Record<string, unknown> | undefined {
  return load<Record<string, unknown>>('bdth_po').find(d => d.trasplante_id === trasplante_id);
}

// ── Alertas ────────────────────────────────────────────────────────────────────

export function insertarAlerta(data: Omit<AlertaLog, 'id'>): void {
  const arr = load<AlertaLog>('bdth_a');
  save('bdth_a', [...arr, { id: nextId(arr), ...data }]);
}

export function borrarAlertasTrasplante(trasplante_id: number): void {
  save('bdth_a', load<AlertaLog>('bdth_a').filter(a => a.trasplante_id !== trasplante_id));
}

export function obtenerAlertasPendientes(trasplante_id: number): AlertaLog[] {
  return load<AlertaLog>('bdth_a').filter(a => a.trasplante_id === trasplante_id && !a.resuelta);
}

export function totalAlertasCriticasPendientes(): number {
  return load<AlertaLog>('bdth_a').filter(a => a.tipo === 'critica' && !a.resuelta).length;
}

export function resolverAlerta(id: number): void {
  save('bdth_a', load<AlertaLog>('bdth_a').map(a => a.id === id ? { ...a, resuelta: 1 } : a));
}

// ── Completitud ────────────────────────────────────────────────────────────────

export function calcularCompletitud(trasplante_id: number): number {
  const secciones = [
    obtenerDonante(trasplante_id),
    obtenerReceptorImplante(trasplante_id),
    obtenerPostoperatorio(trasplante_id),
  ];
  return Math.round((secciones.filter(Boolean).length / 3) * 100);
}

// ── DB export (unused on web) ──────────────────────────────────────────────────
export const db = null;

// ── Dev helpers ────────────────────────────────────────────────────────────────
export function clearDatabase(): void {
  ['bdth_p','bdth_t','bdth_d','bdth_i','bdth_po','bdth_a'].forEach(k => localStorage.removeItem(k));
}
