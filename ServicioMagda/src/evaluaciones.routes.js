/* =====================================================================
   ServicioMagda — evaluaciones.routes.js
   Encuesta de 5 preguntas para evaluación de viajes por tutores
   POST /api/evaluaciones
   GET  /api/evaluaciones
   GET  /api/evaluaciones/:id
   ===================================================================== */
const express        = require('express');
const pool           = require('./db');
const verificarToken = require('./verificarToken');

const router = express.Router();

/* ─────────────────────────────────────────────
   POST /api/evaluaciones
   Tutor guarda una evaluación de viaje
   Body: { invidente_id, id_viaje?, p1, p2, p3, p4, p5 }
───────────────────────────────────────────── */
router.post('/', verificarToken, async (req, res) => {
  if (req.usuario.nombre_rol !== 'Tutor')
    return res.status(403).json({ error: 'Solo los tutores pueden registrar evaluaciones' });

  const {
    invidente_id,
    id_viaje,
    p1_autonomia,
    p2_factores_ambientales,
    p3_confianza,
    p4_claridad_latencia,
    p5_viabilidad_futura
  } = req.body;

  if (!invidente_id)
    return res.status(400).json({ error: 'El ID del invidente es requerido' });

  if (!p1_autonomia || !p2_factores_ambientales || !p3_confianza || !p4_claridad_latencia || !p5_viabilidad_futura)
    return res.status(400).json({ error: 'Todas las 5 preguntas de la encuesta son obligatorias' });

  try {
    // Verificar que el invidente esta vinculado al tutor
    const { rows: vinculo } = await pool.query(
      `SELECT id FROM tutor_usuarios
       WHERE tutor_id = $1 AND invidente_id = $2 AND activo = true`,
      [req.usuario.id, invidente_id]
    );

    if (vinculo.length === 0)
      return res.status(403).json({ error: 'Este invidente no esta vinculado a tu cuenta' });

    const { rows } = await pool.query(
      `INSERT INTO evaluaciones_viaje
         (tutor_id, invidente_id, id_viaje,
          p1_autonomia, p2_factores_ambientales, p3_confianza,
          p4_claridad_latencia, p5_viabilidad_futura)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_evaluacion, fecha_evaluacion`,
      [
        req.usuario.id, invidente_id, id_viaje || null,
        p1_autonomia, p2_factores_ambientales, p3_confianza,
        p4_claridad_latencia, p5_viabilidad_futura
      ]
    );

    console.log(`[evaluaciones] Tutor ${req.usuario.id} guardo evaluacion #${rows[0].id_evaluacion}`);

    res.status(201).json({
      mensaje: 'Evaluacion guardada correctamente',
      id_evaluacion: rows[0].id_evaluacion,
      fecha_evaluacion: rows[0].fecha_evaluacion
    });
  } catch (err) {
    console.error('[evaluaciones][post]', err.message);
    res.status(500).json({ error: 'Error al guardar evaluacion: ' + err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/evaluaciones
   Lista todas las evaluaciones del tutor autenticado
───────────────────────────────────────────── */
router.get('/', verificarToken, async (req, res) => {
  if (req.usuario.nombre_rol !== 'Tutor')
    return res.status(403).json({ error: 'Acceso restringido a tutores' });

  try {
    const { rows } = await pool.query(
      `SELECT ev.id_evaluacion, ev.fecha_evaluacion,
              u.nombre_completo AS invidente_nombre,
              u.correo AS invidente_correo,
              v.fecha_viaje, v.origen, v.destino,
              ev.p1_autonomia, ev.p2_factores_ambientales,
              ev.p3_confianza, ev.p4_claridad_latencia, ev.p5_viabilidad_futura
       FROM evaluaciones_viaje ev
       JOIN usuarios u ON ev.invidente_id = u.id_usuario
       LEFT JOIN viajes v ON ev.id_viaje = v.id_viaje
       WHERE ev.tutor_id = $1
       ORDER BY ev.fecha_evaluacion DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[evaluaciones][get]', err.message);
    res.status(500).json({ error: 'Error al obtener evaluaciones: ' + err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/evaluaciones/:id
   Detalle de una evaluacion especifica
───────────────────────────────────────────── */
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ev.*,
              u.nombre_completo AS invidente_nombre, u.correo AS invidente_correo,
              t.nombre_completo AS tutor_nombre
       FROM evaluaciones_viaje ev
       JOIN usuarios u ON ev.invidente_id = u.id_usuario
       JOIN usuarios t ON ev.tutor_id = t.id_usuario
       WHERE ev.id_evaluacion = $1 AND ev.tutor_id = $2`,
      [parseInt(req.params.id), req.usuario.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: 'Evaluacion no encontrada' });

    res.json(rows[0]);
  } catch (err) {
    console.error('[evaluaciones][get-id]', err.message);
    res.status(500).json({ error: 'Error al obtener evaluacion: ' + err.message });
  }
});

module.exports = router;
