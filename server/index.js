const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// Solo aceptar conexiones desde la red local (192.168.x.x / 10.x.x.x)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS: origen no permitido'));
    }
  }
}));

app.use(express.json({ limit: '100mb' }));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─────────────────────────────────────────────
// POST /upload — recibe Excel en base64
// ─────────────────────────────────────────────
app.post('/upload', (req, res) => {
  try {
    const { file, filename } = req.body;
    if (!file || !filename) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros file o filename' });
    }
    if (!filename.endsWith('.xlsx')) {
      return res.status(400).json({ ok: false, error: 'Solo se aceptan archivos .xlsx' });
    }

    const buffer   = Buffer.from(file, 'base64');
    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`[${new Date().toLocaleString()}] ✅ Recibido: ${safeName} (${sizeKB} KB)`);

    res.json({ ok: true, filename: safeName, size: buffer.length });
  } catch (err) {
    console.error('Error en /upload:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /status — estado del servidor + archivos
// ─────────────────────────────────────────────
app.get('/status', (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => f.endsWith('.xlsx'))
    .sort()
    .reverse();

  res.json({
    ok: true,
    files,
    last:  files[0] ?? null,
    count: files.length,
    dir:   UPLOADS_DIR,
  });
});

// ─────────────────────────────────────────────
// GET /files/:name — descargar un archivo
// ─────────────────────────────────────────────
app.get('/files/:name', (req, res) => {
  const safeName = path.basename(req.params.name);
  const filePath = path.join(UPLOADS_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
  }
  res.download(filePath);
});

// ─────────────────────────────────────────────
// Arranque
// ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  BDTH Server — H. Gregorio Marañón   ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`\n📡 Escuchando en http://0.0.0.0:${PORT}`);
  console.log(`📁 Archivos en:  ${UPLOADS_DIR}`);
  console.log(`\n👉 Configura esta IP en la app: (ver ifconfig / ipconfig)\n`);
});
