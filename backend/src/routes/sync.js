const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware');

const router = Router();
const prisma = new PrismaClient();

// GET /sync/pull?since=<timestamp_ms>
// Devuelve todos los registros actualizados desde `since` que el usuario puede ver
router.get('/pull', authenticate, async (req, res) => {
  const since = req.query.since ? new Date(parseInt(req.query.since)) : new Date(0);
  const esJefe = req.user.rol === 'jefe';

  const where = {
    updated_at: { gt: since },
    ...(esJefe ? {} : { usuario_id: req.user.id }),
    deleted_at: null,
  };

  const trasplantes = await prisma.trasplante.findMany({
    where,
    include: { donante: true, implante: true, postoperatorio: true, paciente: true },
  });

  res.json({ trasplantes, server_time: Date.now() });
});

// POST /sync/push — sube cambios locales pendientes
// Body: { trasplantes: [...], formularios: { donante: [...], implante: [...], postoperatorio: [...] } }
router.post('/push', authenticate, async (req, res) => {
  const { trasplantes = [], formularios = {} } = req.body;
  const results = { created: 0, updated: 0, errors: [] };

  for (const t of trasplantes) {
    try {
      const existing = await prisma.trasplante.findUnique({ where: { sync_id: t.sync_id } });
      if (!existing) {
        // crear — el paciente ya debe existir (se crea en POST /casos)
        // aquí solo actualizamos metadata del trasplante
        results.created++;
      } else {
        // solo actualizar si el cliente tiene timestamp más reciente
        const clientTs = new Date(t.updated_at);
        if (clientTs > existing.updated_at) {
          await prisma.trasplante.update({
            where: { sync_id: t.sync_id },
            data: { estado: t.estado, num_alertas: t.num_alertas, nhc_higado: t.nhc_higado },
          });
          results.updated++;
        }
      }
    } catch (e) {
      results.errors.push({ sync_id: t.sync_id, error: e.message });
    }
  }

  for (const [model, items] of Object.entries(formularios)) {
    if (!['donante', 'implante', 'postoperatorio'].includes(model)) continue;
    for (const item of items ?? []) {
      try {
        const existing = await prisma[model].findUnique({ where: { sync_id: item.sync_id } });
        if (!existing) {
          results.errors.push({ sync_id: item.sync_id, error: 'Trasplante padre no existe aún' });
        } else {
          const clientTs = new Date(item.updated_at);
          if (clientTs > existing.updated_at) {
            await prisma[model].update({ where: { sync_id: item.sync_id }, data: { datos: item.datos } });
            results.updated++;
          }
        }
      } catch (e) {
        results.errors.push({ sync_id: item.sync_id, error: e.message });
      }
    }
  }

  res.json(results);
});

module.exports = router;
