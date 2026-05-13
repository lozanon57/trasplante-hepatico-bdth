const { Router } = require('express');
const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = Router();
const prisma = new PrismaClient();

function signTokens(user) {
  const payload = { id: user.id, rol: user.rol, nombre: user.nombre };
  const access  = jwt.sign(payload, process.env.JWT_SECRET,         { expiresIn: '1h' });
  const refresh = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { access, refresh };
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user || !user.activo) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

  res.json({ ...signTokens(user), rol: user.rol, nombre: user.nombre });
});

// POST /auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const access  = jwt.sign(
      { id: payload.id, rol: payload.rol, nombre: payload.nombre },
      process.env.JWT_SECRET, { expiresIn: '1h' }
    );
    res.json({ access });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
});

module.exports = router;
