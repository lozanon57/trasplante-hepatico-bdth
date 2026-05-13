const { PrismaClient } = require('@prisma/client');
const { hashAudit } = require('./crypto');

const prisma = new PrismaClient();

async function registrarAudit({ tipo, tabla, registro_id, usuario_id, datos }) {
  const ultimo = await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } });
  const hash_anterior = ultimo?.hash_registro ?? '0'.repeat(64);
  const created_at    = new Date().toISOString();
  const datos_json    = JSON.stringify(datos);
  const hash_registro = hashAudit({ datos_json, hash_anterior, created_at, usuario_id });

  await prisma.auditLog.create({
    data: { tipo, tabla, registro_id, usuario_id, datos_json, hash_anterior, hash_registro, created_at: new Date(created_at) },
  });
}

module.exports = { registrarAudit };
