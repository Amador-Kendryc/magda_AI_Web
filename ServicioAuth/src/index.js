/* =====================================================================
   ServicioAuth — index.js
   Servicio de Autenticación MAGDA × TINGO
   Puerto: 3001 (o process.env.PORT)
   ===================================================================== */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const pool    = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware ── */
app.use(cors());
app.use(express.json());

/* ── Auto-inicialización de BD si está vacía ── */
async function inicializarTablas() {
  try {
    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tutor_usuarios'
      );
    `);
    if (!rows[0].exists) {
      console.log('[ServicioAuth][DB] Inicializando tablas y roles en PostgreSQL...');
      const schemaPath  = path.join(__dirname, '..', '..', 'db', 'schema.sql');
      const migratePath = path.join(__dirname, '..', '..', 'db', 'migrate_v2.sql');
      
      if (fs.existsSync(schemaPath)) {
        await pool.query(fs.readFileSync(schemaPath, 'utf8'));
      }
      if (fs.existsSync(migratePath)) {
        await pool.query(fs.readFileSync(migratePath, 'utf8'));
      }
      console.log('[ServicioAuth][DB] Tablas, índices y roles creados exitosamente');
    }
  } catch (err) {
    console.error('[ServicioAuth][DB] Aviso al verificar tablas:', err.message);
  }
}

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
    await inicializarTablas();
    app.listen(PORT, () => {
      console.log(`🔐 ServicioAuth MAGDA en → http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ ServicioAuth — Error de conexión:', err.message);
    process.exit(1);
  }
}

iniciar();
