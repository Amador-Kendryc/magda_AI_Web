/* =====================================================================
   ServicioMagda — tutores.routes.js
   Rutas de gestión Tutor <-> Invidentes
   GET  /api/tutores/mis-invidentes
   POST /api/tutores/vincular
   DELETE /api/tutores/desvincular/:invidente_id
   ===================================================================== */
const express        = require('express');
const pool           = require('./db');
const verificarToken = require('./verificarToken');

const router = express.Router();

/* ─────────────────────────────────────────────
   GET /api/tutores/mis-invidentes
   Lista todos los invidentes vinculados al tutor autenticado
───────────────────────────────────────────── */
router.get('/mis-invidentes', verificarToken, async (req, res) => {
  if (req.usuario.nombre_rol !== 'Tutor')
    return res.status(403).json({ error: 'Solo los tutores pueden acceder a esta ruta' });

  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo, u.activo,
              tu.vinculado_en, tu.activo AS vinculo_activo
       FROM tutor_usuarios tu
       JOIN usuarios u ON tu.invidente_id = u.id_usuario
       WHERE tu.tutor_id = $1 AND tu.activo = true
       ORDER BY tu.vinculado_en DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[tutores][mis-invidentes]', err.message);
    res.status(500).json({ error: 'Error al obtener invidentes: ' + err.message });
  }
});

/* ─────────────────────────────────────────────
   POST /api/tutores/vincular
   Body: { correo_invidente }
   Vincula a un invidente existente al tutor autenticado
───────────────────────────────────────────── */
router.post('/vincular', verificarToken, async (req, res) => {
  if (req.usuario.nombre_rol !== 'Tutor')
    return res.status(403).json({ error: 'Solo los tutores pueden vincular invidentes' });

  const { correo_invidente } = req.body;
  if (!correo_invidente)
    return res.status(400).json({ error: 'Correo del invidente requerido' });

  try {
    // Buscar al invidente por correo
    const { rows: inv } = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, r.nombre_rol
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.correo = $1 AND u.activo = true`,
      [correo_invidente.toLowerCase().trim()]
    );

    if (inv.length === 0)
      return res.status(404).json({ error: 'No se encontro un usuario con ese correo' });

    if (inv[0].nombre_rol !== 'Invidente')
      return res.status(400).json({ error: 'El usuario no tiene el rol de Invidente' });

    if (inv[0].id_usuario === req.usuario.id)
      return res.status(400).json({ error: 'No puedes vincularte a ti mismo' });

    // Insertar vinculo (ignorar si ya existe)
    await pool.query(
      `INSERT INTO tutor_usuarios (tutor_id, invidente_id, activo)
       VALUES ($1, $2, true)
       ON CONFLICT (tutor_id, invidente_id)
       DO UPDATE SET activo = true, vinculado_en = NOW()`,
      [req.usuario.id, inv[0].id_usuario]
    );

    res.json({
      mensaje: `${inv[0].nombre_completo} vinculado correctamente a tu cuenta`,
      invidente: { id_usuario: inv[0].id_usuario, nombre_completo: inv[0].nombre_completo }
    });
  } catch (err) {
    console.error('[tutores][vincular]', err.message);
    res.status(500).json({ error: 'Error al vincular: ' + err.message });
  }
});

/* ─────────────────────────────────────────────
   DELETE /api/tutores/desvincular/:invidente_id
   Desvincula (soft delete) al invidente del tutor
───────────────────────────────────────────── */
router.delete('/desvincular/:invidente_id', verificarToken, async (req, res) => {
  if (req.usuario.nombre_rol !== 'Tutor')
    return res.status(403).json({ error: 'Acceso denegado' });

  try {
    const result = await pool.query(
      `UPDATE tutor_usuarios SET activo = false
       WHERE tutor_id = $1 AND invidente_id = $2 AND activo = true`,
      [req.usuario.id, parseInt(req.params.invidente_id)]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Vinculo no encontrado o ya inactivo' });

    res.json({ mensaje: 'Invidente desvinculado correctamente' });
  } catch (err) {
    console.error('[tutores][desvincular]', err.message);
    res.status(500).json({ error: 'Error al desvincular: ' + err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/tutores/mi-tutor
   El invidente obtiene sus tutores asignados
───────────────────────────────────────────── */
router.get('/mi-tutor', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario AS id_tutor,
              u.nombre_completo AS nombre_tutor,
              u.correo AS correo_tutor,
              tu.vinculado_en
       FROM tutor_usuarios tu
       JOIN usuarios u ON tu.tutor_id = u.id_usuario
       WHERE tu.invidente_id = $1 AND tu.activo = true
       ORDER BY tu.vinculado_en DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[tutores][mi-tutor]', err.message);
    res.status(500).json({ error: 'Error al obtener tutores: ' + err.message });
  }
});

module.exports = router;

