const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'ServicioAuth', '.env') });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME     || 'postgres',
});

const sqlPath = path.join(__dirname, '..', 'db', 'migrate_v2.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

pool.connect()
  .then(client => {
    console.log('[migrate] Conectado a PostgreSQL en', process.env.DB_HOST + ':' + process.env.DB_PORT);
    return client.query(sql)
      .then(() => {
        console.log('[migrate] MIGRACION v2 COMPLETADA exitosamente.');
        client.release();
      })
      .catch(err => {
        client.release();
        throw err;
      });
  })
  .then(() => pool.end())
  .catch(err => {
    console.error('[migrate] ERROR:', err.message);
    pool.end();
    process.exit(1);
  });
