/* =====================================================================
   ServicioMagda — historial.routes.js
   Rutas: GET /api/historial
   Requiere autenticación JWT
   ===================================================================== */
const express        = require('express');
const pool           = require('./db');
const verificarToken = require('./verificarToken');

const router = express.Router();

/* ─────────────────────────────────────────────
   GET /api/historial — Historial de accesos del usuario
   Requiere: Authorization: Bearer {token}
   Query:    ?limite=20  (opcional)
───────────────────────────────────────────── */
router.get('/', verificarToken, async (req, res) => {
  const limite = Math.min(parseInt(req.query.limite) || 20, 100);

  try {
    const { rows } = await pool.query(
      `SELECT id_acceso, fecha_ingreso, direccion_ip, dispositivo
       FROM historial_accesos
       WHERE id_usuario = $1
       ORDER BY fecha_ingreso DESC
       LIMIT $2`,
      [req.usuario.id, limite]
    );

    res.json(rows);
  } catch (err) {
    console.error('[ServicioMagda][historial]', err.message);
    res.status(500).json({ error: 'Error al obtener historial: ' + err.message });
  }
});

module.exports = router;
