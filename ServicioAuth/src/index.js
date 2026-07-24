/* =====================================================================
   ServicioAuth — index.js
   Servicio de Autenticación MAGDA × TINGO
   Puerto: 3001
   Rutas:  POST /api/auth/login
           POST /api/auth/register
           GET  /api/auth/health
   ===================================================================== */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const pool    = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware ── */
app.use(cors());
app.use(express.json());

/* ── Rutas ── */
app.use('/api/auth', require('./auth.routes'));

/* ── Health check propio del servicio ── */
app.get('/api/auth/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS hora, version() AS ver');
    res.json({
      servicio:   'ServicioAuth',
      estado:     'ok',
      puerto:     PORT,
      hora:       r.rows[0].hora,
      version_pg: r.rows[0].ver.split(' ').slice(0, 2).join(' ')
    });
  } catch (err) {
    res.status(500).json({ servicio: 'ServicioAuth', estado: 'error', error: err.message });
  }
});

/* ── Iniciar servidor ── */
async function iniciar() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ ServicioAuth — Conexión a PostgreSQL establecida');
    app.listen(PORT, () => {
      console.log(`🔐 ServicioAuth MAGDA en → http://localhost:${PORT}`);
      console.log(`   POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   POST http://localhost:${PORT}/api/auth/register`);
      console.log(`   GET  http://localhost:${PORT}/api/auth/health`);
    });
  } catch (err) {
    console.error('❌ ServicioAuth — Error de conexión:', err.message);
    process.exit(1);
  }
}

iniciar();
