/* =====================================================================
   ServicioMagda — db.js
   Conexión a PostgreSQL para el Servicio Principal MAGDA
   Soporta conexión local y DATABASE_URL en la nube (Render / Neon / Railway)
   ===================================================================== */
require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'postgres',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || 'Nolose21',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(config);

pool.on('error', err => console.error('[ServicioMagda][DB] Error en pool:', err.message));

module.exports = pool;
