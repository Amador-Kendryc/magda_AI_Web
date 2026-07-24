/* =====================================================================
   ServicioMagda — index.js v2.2 (Cloud Gateway & Multi-fallback)
   Puerto: 3002 (o process.env.PORT) — Portal MAGDA informativo + Gateway SOA
   ===================================================================== */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const pool    = require('./db');

const app  = express();
const PORT = process.env.PORT || 3002;

/* Helper para formatear URL del microservicio de autenticación */
function formatAuthUrl(rawUrl) {
  if (!rawUrl) return 'http://localhost:3001';
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.port && !parsed.hostname.includes('.')) {
      parsed.port = '10000';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
  }
}

const PRIMARY_AUTH_URL = formatAuthUrl(process.env.AUTH_SERVICE_URL);

app.use(cors());
app.use(express.json());

/* ── Proxy transparente hacia ServicioAuth ── */
app.use('/api/auth', async (req, res) => {
  const candidateUrls = [
    PRIMARY_AUTH_URL,
    'http://magda-servicio-auth:10000',
    'http://localhost:3001'
  ];
  
  // Eliminar duplicados
  const targets = [...new Set(candidateUrls)];
  
  let lastError = null;
  let responseData = null;
  let responseStatus = 502;
  let success = false;

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

  for (const baseUrl of targets) {
    try {
      const targetUrl = `${baseUrl}/api/auth${req.url}`;
      console.log(`[ServicioMagda][Proxy] Intentando ${req.method} -> ${targetUrl}`);
      const r = await fetch(targetUrl, options);
      const contentType = r.headers.get('content-type');
      responseData = contentType && contentType.includes('application/json')
        ? await r.json()
        : await r.text();
      responseStatus = r.status;
      success = true;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[ServicioMagda][Proxy] Fallo intento hacia ${baseUrl}: ${err.message}`);
    }
  }

  if (success) {
    res.status(responseStatus).json(typeof responseData === 'string' ? { message: responseData } : responseData);
  } else {
    console.error('[ServicioMagda][AuthProxyError]', lastError?.message);
    res.status(502).json({ error: 'Error al conectar con ServicioAuth: ' + (lastError?.message || 'No responde') });
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
      servicio:   'ServicioMagda v2.2',
      estado:     'ok',
      puerto:     PORT,
      auth_target: PRIMARY_AUTH_URL,
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
