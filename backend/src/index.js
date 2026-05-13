require('dotenv').config();
const express    = require('express');
const cors       = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/auth',        require('./routes/auth'));
app.use('/casos',       require('./routes/casos'));
app.use('/sync',        require('./routes/sync'));
app.use('/usuarios',    require('./routes/usuarios'));
app.use('/integridad',  require('./routes/integridad'));

app.get('/status', (_req, res) => res.json({ ok: true, service: 'BDTH API', version: '2.0.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BDTH API en puerto ${PORT}`));
