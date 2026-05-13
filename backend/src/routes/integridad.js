const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, soloJefe } = require('../middleware');
const { hashAudit } = require('../crypto');

const router = Router();
const prisma = new PrismaClient();

// GET /integridad/verificar — recorre toda la cadena de hashes
router.get('/verificar', authenticate, soloJefe, async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { id: 'asc' } });

  let ok = true;
  const errores = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const esperado = hashAudit({
      datos_json:    log.datos_json,
      hash_anterior: log.hash_anterior,
      created_at:    log.created_at.toISOString(),
      usuario_id:    log.usuario_id,
    });
    if (esperado !== log.hash_registro) {
      ok = false;
      errores.push({ id: log.id, tabla: log.tabla, registro_id: log.registro_id });
    }
  }

  res.json({
    ok,
    total_registros: logs.length,
    errores,
    mensaje: ok
      ? `Cadena íntegra — ${logs.length} registros verificados sin anomalías`
      : `⚠️ Se detectaron ${errores.length} registros con hash inconsistente`,
  });
});

module.exports = router;
