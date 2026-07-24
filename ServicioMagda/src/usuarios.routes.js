/* =====================================================================
   ServicioMagda — usuarios.routes.js
   Rutas: GET /api/usuarios/perfil
          GET /api/usuarios/stats
          GET /api/roles
   ===================================================================== */
const express        = require('express');
const pool           = require('./db');
const verificarToken = require('./verificarToken');

const router = express.Router();

/* ─────────────────────────────────────────────
   GET /api/usuarios/perfil — Perfil autenticado
   Requiere: Authorization: Bearer {token}
───────────────────────────────────────────── */
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo,
              u.creado_en, u.activo,
              r.nombre_rol, r.descripcion AS descripcion_rol
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = $1`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[ServicioMagda][perfil]', err.message);
    res.status(500).json({ error: 'Error al obtener perfil: ' + err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/usuarios/stats — Estadísticas del sistema
   Ruta pública (no requiere token)
───────────────────────────────────────────── */
router.get('/stats', async (req, res) => {
  try {
    const usuarios = await pool.query(
      'SELECT COUNT(*) AS total FROM usuarios WHERE activo = true'
    );
    const accesos = await pool.query(
      'SELECT COUNT(*) AS total FROM historial_accesos'
    );
    const roles = await pool.query(
      'SELECT COUNT(*) AS total FROM roles'
    );

    res.json({
      usuarios_activos: parseInt(usuarios.rows[0].total),
      total_accesos:    parseInt(accesos.rows[0].total),
      total_roles:      parseInt(roles.rows[0].total)
    });
  } catch (err) {
    console.error('[ServicioMagda][stats]', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas: ' + err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/roles — Catálogo de roles
   Ruta pública
───────────────────────────────────────────── */
router.get('/roles', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id_rol, nombre_rol, descripcion FROM roles ORDER BY id_rol'
    );
    res.json(rows);
  } catch (err) {
    console.error('[ServicioMagda][roles]', err.message);
    res.status(500).json({ error: 'Error al obtener roles: ' + err.message });
  }
});

module.exports = router;
