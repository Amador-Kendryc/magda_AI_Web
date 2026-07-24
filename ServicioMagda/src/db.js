/* =====================================================================
   ServicioMagda — db.js
   Conexión a PostgreSQL para el Servicio Principal MAGDA
   ===================================================================== */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'postgres',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'Nolose21',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', err => console.error('[ServicioMagda][DB] Error en pool:', err.message));

module.exports = pool;
