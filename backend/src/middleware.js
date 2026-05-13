const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function soloJefe(req, res, next) {
  if (req.user?.rol !== 'jefe') return res.status(403).json({ error: 'Acceso restringido al jefe de servicio' });
  next();
}

module.exports = { authenticate, soloJefe };
