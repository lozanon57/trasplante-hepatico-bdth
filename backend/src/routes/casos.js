const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, soloJefe } = require('../middleware');
const { hashNHC, encryptNHC, decryptNHC } = require('../crypto');
const { registrarAudit } = require('../audit');
const crypto = require('crypto');

const router = Router();
const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function codigoAnon() {
  return 'BDT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function soloSuyos(req) {
  return req.user.rol !== 'jefe';
}

// ── GET /casos — lista casos ──────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const where = soloSuyos(req) ? { usuario_id: req.user.id, deleted_at: null } : { deleted_at: null };
  const casos = await prisma.trasplante.findMany({
    where,
    include: { paciente: true, usuario: { select: { nombre: true } } },
    orderBy: { updated_at: 'desc' },
  });
  // Jefe ve NHC descifrado; cirujano no
  const result = casos.map(c => ({
    ...c,
    nhc: req.user.rol === 'jefe' ? decryptNHC(c.paciente.nhc_cifrado) : undefined,
    codigo_anon: c.paciente.codigo_anon,
    cirujano: c.usuario.nombre,
  }));
  res.json(result);
});

// ── GET /casos/buscar?nhc=XXXXX ───────────────────────────────────────────────
router.get('/buscar', authenticate, async (req, res) => {
  const { nhc } = req.query;
  if (!nhc) return res.status(400).json({ error: 'nhc requerido' });

  const hash     = hashNHC(nhc);
  const paciente = await prisma.paciente.findUnique({ where: { nhc_hash: hash } });
  if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

  const where = soloSuyos(req)
    ? { paciente_id: paciente.id, usuario_id: req.user.id, deleted_at: null }
    : { paciente_id: paciente.id, deleted_at: null };

  const casos = await prisma.trasplante.findMany({
    where,
    include: { usuario: { select: { nombre: true } } },
    orderBy: { fecha_trasplante: 'desc' },
  });
  res.json({ paciente: { ...paciente, nhc: decryptNHC(paciente.nhc_cifrado) }, casos });
});

// ── POST /casos — crear caso ──────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  const { nhc, grupo_abo, sync_id, nhc_higado, fecha_trasplante } = req.body;
  if (!nhc || !sync_id) return res.status(400).json({ error: 'nhc y sync_id requeridos' });

  const nhc_hash    = hashNHC(nhc);
  const nhc_cifrado = encryptNHC(nhc);

  let paciente = await prisma.paciente.findUnique({ where: { nhc_hash } });
  if (!paciente) {
    paciente = await prisma.paciente.create({
      data: { nhc_hash, nhc_cifrado, codigo_anon: codigoAnon(), grupo_abo: grupo_abo ?? null },
    });
  }

  const existing = await prisma.trasplante.findUnique({ where: { sync_id } });
  if (existing) return res.json(existing);

  const trasplante = await prisma.trasplante.create({
    data: { sync_id, paciente_id: paciente.id, usuario_id: req.user.id, nhc_higado, fecha_trasplante },
  });
  await registrarAudit({ tipo: 'INSERT', tabla: 'trasplante', registro_id: trasplante.id, usuario_id: req.user.id, datos: trasplante });
  res.status(201).json({ ...trasplante, codigo_anon: paciente.codigo_anon });
});

// ── PUT /casos/:id — editar (solo el dueño o jefe) ───────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  const t  = await prisma.trasplante.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ error: 'No encontrado' });
  if (soloSuyos(req) && t.usuario_id !== req.user.id) return res.status(403).json({ error: 'Sin permisos' });

  const { nhc_higado, fecha_trasplante, estado, num_alertas } = req.body;
  const updated = await prisma.trasplante.update({
    where: { id },
    data: { nhc_higado, fecha_trasplante, estado, num_alertas },
  });
  await registrarAudit({ tipo: 'UPDATE', tabla: 'trasplante', registro_id: id, usuario_id: req.user.id, datos: updated });
  res.json(updated);
});

// ── Formularios clínicos: donante / implante / postoperatorio ─────────────────

async function upsertFormulario(model, sync_id, trasplante_id, datos, usuario_id, tabla) {
  const existing = await prisma[model].findUnique({ where: { sync_id } });
  let registro;
  if (existing) {
    registro = await prisma[model].update({ where: { sync_id }, data: { datos } });
    await registrarAudit({ tipo: 'UPDATE', tabla, registro_id: registro.id, usuario_id, datos });
  } else {
    registro = await prisma[model].create({ data: { sync_id, trasplante_id, datos } });
    await registrarAudit({ tipo: 'INSERT', tabla, registro_id: registro.id, usuario_id, datos });
  }
  return registro;
}

for (const [path, model, tabla] of [
  ['donante',        'donante',        'donante'],
  ['implante',       'implante',       'implante'],
  ['postoperatorio', 'postoperatorio', 'postoperatorio'],
]) {
  router.post(`/:id/${path}`, authenticate, async (req, res) => {
    const trasplante_id = parseInt(req.params.id);
    const { sync_id, datos } = req.body;
    if (!sync_id || !datos) return res.status(400).json({ error: 'sync_id y datos requeridos' });

    const t = await prisma.trasplante.findUnique({ where: { id: trasplante_id } });
    if (!t) return res.status(404).json({ error: 'Trasplante no encontrado' });
    if (soloSuyos(req) && t.usuario_id !== req.user.id) return res.status(403).json({ error: 'Sin permisos' });

    const registro = await upsertFormulario(model, sync_id, trasplante_id, datos, req.user.id, tabla);
    res.json(registro);
  });
}

module.exports = router;
