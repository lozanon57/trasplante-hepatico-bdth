const { Router } = require('express');
const bcrypt      = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { authenticate, soloJefe } = require('../middleware');

const router = Router();
const prisma = new PrismaClient();

// GET /usuarios
router.get('/', authenticate, soloJefe, async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, email: true, rol: true, activo: true, created_at: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(usuarios);
});

// POST /usuarios — crear usuario
router.post('/', authenticate, soloJefe, async (req, res) => {
  const { nombre, email, password, rol = 'cirujano' } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'nombre, email y password requeridos' });
  if (!['cirujano', 'jefe'].includes(rol)) return res.status(400).json({ error: 'rol inválido' });

  const hash = await bcrypt.hash(password, 12);
  try {
    const u = await prisma.usuario.create({ data: { nombre, email, password: hash, rol } });
    res.status(201).json({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol });
  } catch {
    res.status(409).json({ error: 'Email ya registrado' });
  }
});

// PATCH /usuarios/:id/activo — activar / desactivar
router.patch('/:id/activo', authenticate, soloJefe, async (req, res) => {
  const id     = parseInt(req.params.id);
  const activo = Boolean(req.body.activo);
  const u = await prisma.usuario.update({ where: { id }, data: { activo } });
  res.json({ id: u.id, activo: u.activo });
});

// PATCH /usuarios/:id/password — cambiar contraseña
router.patch('/:id/password', authenticate, soloJefe, async (req, res) => {
  const id   = parseInt(req.params.id);
  const hash = await bcrypt.hash(req.body.password, 12);
  await prisma.usuario.update({ where: { id }, data: { password: hash } });
  res.json({ ok: true });
});

module.exports = router;
