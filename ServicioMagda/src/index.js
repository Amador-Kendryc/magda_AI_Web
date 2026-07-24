/* =====================================================================
   ServicioMagda — index.js v2
   Puerto: 3002 — Portal MAGDA informativo + API SOA
   ===================================================================== */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const pool    = require('./db');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

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
      servicio:   'ServicioMagda v2',
      estado:     'ok',
      puerto:     PORT,
      hora:       r.rows[0].hora,
      version_pg: r.rows[0].ver.split(' ').slice(0, 2).join(' '),
      rutas: [
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
