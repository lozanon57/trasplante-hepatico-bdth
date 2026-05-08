// Web implementation — uses localStorage instead of SQLite

export type Paciente = {
  id: number; codigo_anon: string; nhc_hash: string;
  grupo_abo: string | null; fecha_creacion: number; creado_por: string | null;
};
export type Trasplante = {
  id: number; paciente_id: number; fecha_trasplante: number | null;
  estado: string; num_alertas: number; alertas_criticas: number;
  tiene_donante: number; tiene_implante: number; tiene_postop: number;
};

const KEY_PAC  = 'bdth_pacientes';
const KEY_TRA  = 'bdth_trasplantes';
const KEY_DON  = 'bdth_donantes';
const KEY_IMP  = 'bdth_implantes';
const KEY_POST = 'bdth_postops';

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}
function nextId<T extends { id: number }>(arr: T[]): number {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

export async function initDatabase(): Promise<void> {
  // No-op on web — localStorage is always ready
}

export async function crearPaciente(
  codigo_anon: string, nhc_hash: string, grupo_abo: string, creado_por: string
): Promise<number> {
  const pacs = load<Paciente>(KEY_PAC);
  const existing = pacs.find(p => p.nhc_hash === nhc_hash);
  if (existing) {
    const tras = load<Trasplante>(KEY_TRA);
    const t = tras.find(t => t.paciente_id === existing.id);
    return t?.id ?? 0;
  }
  const pac: Paciente = {
    id: nextId(pacs), codigo_anon, nhc_hash, grupo_abo,
    fecha_creacion: Date.now(), creado_por,
  };
  pacs.push(pac);
  save(KEY_PAC, pacs);
  const tras = load<Trasplante>(KEY_TRA);
  const tra: Trasplante = {
    id: nextId(tras), paciente_id: pac.id, fecha_trasplante: null,
    estado: 'incompleto', num_alertas: 0, alertas_criticas: 0,
    tiene_donante: 0, tiene_implante: 0, tiene_postop: 0,
  };
  tras.push(tra);
  save(KEY_TRA, tras);
  return tra.id;
}

export async function listarTrasplantes(): Promise<(Trasplante & { codigo_anon: string; grupo_abo: string | null })[]> {
  const pacs = load<Paciente>(KEY_PAC);
  const tras = load<Trasplante>(KEY_TRA);
  return tras.map(t => {
    const p = pacs.find(p => p.id === t.paciente_id);
    return { ...t, codigo_anon: p?.codigo_anon ?? '—', grupo_abo: p?.grupo_abo ?? null };
  }).reverse();
}

export async function obtenerTrasplante(id: number): Promise<Trasplante | null> {
  return load<Trasplante>(KEY_TRA).find(t => t.id === id) ?? null;
}

export async function buscarPacientePorCodigo(codigo: string) {
  const pacs = load<Paciente>(KEY_PAC);
  const p = pacs.find(p => p.codigo_anon.toLowerCase().includes(codigo.toLowerCase()));
  if (!p) return null;
  const t = load<Trasplante>(KEY_TRA).find(t => t.paciente_id === p.id);
  return t ? { ...t, codigo_anon: p.codigo_anon, grupo_abo: p.grupo_abo } : null;
}

export async function buscarPacientePorHash(nhc_hash: string) {
  const p = load<Paciente>(KEY_PAC).find(p => p.nhc_hash === nhc_hash);
  if (!p) return null;
  const t = load<Trasplante>(KEY_TRA).find(t => t.paciente_id === p.id);
  return t ? { ...t, codigo_anon: p.codigo_anon, grupo_abo: p.grupo_abo } : null;
}

export async function guardarDonante(trasplante_id: number, data: Record<string, unknown>): Promise<void> {
  const arr = load<Record<string, unknown>>(KEY_DON).filter(d => d.trasplante_id !== trasplante_id);
  arr.push({ ...data, trasplante_id });
  save(KEY_DON, arr);
  const tras = load<Trasplante>(KEY_TRA);
  const idx = tras.findIndex(t => t.id === trasplante_id);
  if (idx >= 0) { tras[idx].tiene_donante = 1; save(KEY_TRA, tras); }
}

export async function obtenerDonante(trasplante_id: number) {
  return load<Record<string, unknown>>(KEY_DON).find(d => d.trasplante_id === trasplante_id) ?? null;
}

export async function guardarReceptorImplante(trasplante_id: number, data: Record<string, unknown>): Promise<void> {
  const arr = load<Record<string, unknown>>(KEY_IMP).filter(d => d.trasplante_id !== trasplante_id);
  arr.push({ ...data, trasplante_id });
  save(KEY_IMP, arr);
  const tras = load<Trasplante>(KEY_TRA);
  const idx = tras.findIndex(t => t.id === trasplante_id);
  if (idx >= 0) { tras[idx].tiene_implante = 1; save(KEY_TRA, tras); }
}

export async function obtenerReceptorImplante(trasplante_id: number) {
  return load<Record<string, unknown>>(KEY_IMP).find(d => d.trasplante_id === trasplante_id) ?? null;
}

export async function guardarPostoperatorio(trasplante_id: number, data: Record<string, unknown>): Promise<void> {
  const arr = load<Record<string, unknown>>(KEY_POST).filter(d => d.trasplante_id !== trasplante_id);
  arr.push({ ...data, trasplante_id });
  save(KEY_POST, arr);
  const tras = load<Trasplante>(KEY_TRA);
  const idx = tras.findIndex(t => t.id === trasplante_id);
  if (idx >= 0) { tras[idx].tiene_postop = 1; save(KEY_TRA, tras); }
}

export async function obtenerPostoperatorio(trasplante_id: number) {
  return load<Record<string, unknown>>(KEY_POST).find(d => d.trasplante_id === trasplante_id) ?? null;
}

export async function calcularCompletitud(trasplante_id: number): Promise<number> {
  const t = await obtenerTrasplante(trasplante_id);
  if (!t) return 0;
  return Math.round(((t.tiene_donante + t.tiene_implante + t.tiene_postop) / 3) * 100);
}

export async function generarAlertas(_trasplante_id: number): Promise<void> {}
export async function contarAlertas(_trasplante_id: number) { return { total: 0, criticas: 0 }; }
