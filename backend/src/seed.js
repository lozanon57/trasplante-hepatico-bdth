// Crea el usuario jefe inicial
// Uso: node src/seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const password = process.env.JEFE_PASSWORD || 'CambiaMeAhora123!';
  const hash     = await bcrypt.hash(password, 12);

  const jefe = await prisma.usuario.upsert({
    where:  { email: 'jefe@hgm.es' },
    update: {},
    create: { nombre: 'Jefe de Servicio', email: 'jefe@hgm.es', password: hash, rol: 'jefe' },
  });

  console.log('Usuario jefe creado:', jefe.email);
  console.log('Contraseña inicial:', password);
  console.log('⚠️  Cámbiala en el primer login');
}

main().finally(() => prisma.$disconnect());
