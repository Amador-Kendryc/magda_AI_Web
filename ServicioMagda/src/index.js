/* =====================================================================
   ServicioMagda — index.js v2.1 (Cloud & Production Ready)
   Puerto: 3002 (o process.env.PORT) — Portal MAGDA informativo + Gateway SOA
   ===================================================================== */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const pool    = require('./db');

const app  = express();
const PORT = process.env.PORT || 3002;
let AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
if (!AUTH_SERVICE_URL.startsWith('http://') && !AUTH_SERVICE_URL.startsWith('https://')) {
  AUTH_SERVICE_URL = `http://${AUTH_SERVICE_URL}`;
}


app.use(cors());
app.use(express.json());

/* ── Proxy transparente hacia ServicioAuth ── */
app.use('/api/auth', async (req, res) => {
  try {
    const targetUrl = `${AUTH_SERVICE_URL.replace(/\/$/, '')}/api/auth${req.url}`;
    const options = {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        'authorization': req.headers['authorization'] || '',
        'user-agent': req.headers['user-agent'] || '',
      }
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }
    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    res.status(response.status).json(typeof data === 'string' ? { message: data } : data);
  } catch (err) {
    console.error('[ServicioMagda][AuthProxyError]', err.message);
    res.status(502).json({ error: 'Error al conectar con ServicioAuth: ' + err.message });
  }
});

/* ── Archivos estáticos: frontend + media ── */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ── Rutas SOA ── */
app.use('/api/usuarios',    require('./usuarios.routes'));
app.use('/api/historial',   require('./historial.routes'));
app.use('/api/tutores',     require('./tutores.routes'));
app.use('/api/evaluaciones',require('./evaluaciones.routes'));

/* ── Health check ── */
app.get('/api/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS hora, version() AS ver');
    res.json({
      servicio:   'ServicioMagda v2.1',
      estado:     'ok',
      puerto:     PORT,
      auth_target: AUTH_SERVICE_URL,
      hora:       r.rows[0].hora,
      version_pg: r.rows[0].ver.split(' ').slice(0, 2).join(' '),
      rutas: [
        'POST /api/auth/login        Proxy -> ServicioAuth',
        'POST /api/auth/register     Proxy -> ServicioAuth',
        'GET  /api/usuarios/perfil   JWT',
        'GET  /api/usuarios/stats',
        'GET  /api/historial          JWT',
        'GET  /api/tutores/mis-invidentes  JWT(tutor)',
        'POST /api/tutores/vincular        JWT(tutor)',
        'POST /api/evaluaciones            JWT(tutor)',
        'GET  /api/evaluaciones            JWT(tutor)',
      ]
    });
  } catch (err) {
    res.status(500).json({ servicio: 'ServicioMagda', estado: 'error', error: err.message });
  }
});

/* ── SPA catch-all ── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function iniciar() {
  try {
    await pool.query('SELECT 1');
    console.log('[ServicioMagda] Conexion a PostgreSQL establecida');
    app.listen(PORT, () => {
      console.log(`[ServicioMagda] Portal MAGDA en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[ServicioMagda] Error de conexion:', err.message);
    process.exit(1);
  }
}

iniciar();
