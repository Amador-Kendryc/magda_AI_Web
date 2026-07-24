/* =====================================================================
   ServicioAuth — auth.routes.js v2
   Rutas: POST /api/auth/login
          POST /api/auth/register   (acepta tipo_rol: "tutor"|"invidente")
          POST /api/auth/register-invidente  (tutor registra a un invidente)
   ===================================================================== */
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('./db');
const verificarToken = require('./verificarToken');

const router = express.Router();

/* ── Helpers ── */
const obtenerIP = req =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress || '127.0.0.1';

const obtenerDispositivo = req => {
  const ua = req.headers['user-agent'] || '';
  if (/mobile/i.test(ua)) return 'Movil';
  if (/tablet/i.test(ua)) return 'Tablet';
  return 'Escritorio';
};

/* Mapa de nombres de rol a id_rol */
const ROL_MAP = { tutor: null, invidente: null, usuario: null };

async function resolverRol(tipoRol) {
  let nombre;
  if (tipoRol === 'tutor')     nombre = 'Tutor';
  else if (tipoRol === 'invidente') nombre = 'Invidente';
  else nombre = 'Usuario';

  const { rows } = await pool.query(
    'SELECT id_rol FROM roles WHERE nombre_rol = $1', [nombre]
  );
  return rows[0]?.id_rol || 1;
}

/* ─────────────────────────────────────────────────────────────────────
   POST /api/auth/register
   Body: { nombre_completo, correo, contrasena, tipo_rol? }
   tipo_rol: "tutor" | "invidente" | "usuario" (default: usuario)
───────────────────────────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  const { nombre_completo, correo, contrasena, tipo_rol, id_rol } = req.body;

  if (!nombre_completo || !correo || !contrasena)
    return res.status(400).json({ error: 'Nombre, correo y contrasena son obligatorios' });
  if (contrasena.length < 6)
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });

  try {
    const existe = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = $1',
      [correo.toLowerCase().trim()]
    );
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Este correo ya esta registrado' });

    const rolId = id_rol || await resolverRol(tipo_rol);
    const hash  = await bcrypt.hash(contrasena, 12);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre_completo, correo, contrasena, id_rol, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id_usuario, nombre_completo, correo, creado_en, id_rol`,
      [nombre_completo.trim(), correo.toLowerCase().trim(), hash, rolId]
    );
    const usuario = rows[0];

    // Obtener nombre_rol para el JWT
    const rolRow = await pool.query(
      'SELECT nombre_rol FROM roles WHERE id_rol = $1', [usuario.id_rol]
    );
    const nombre_rol = rolRow.rows[0]?.nombre_rol || 'Usuario';

    await pool.query(
      'INSERT INTO historial_accesos (id_usuario, direccion_ip, dispositivo) VALUES ($1, $2, $3)',
      [usuario.id_usuario, obtenerIP(req), obtenerDispositivo(req)]
    );

    const token = jwt.sign(
      {
        id:         usuario.id_usuario,
        correo:     usuario.correo,
        nombre:     usuario.nombre_completo,
        rol:        usuario.id_rol,
        nombre_rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`[ServicioAuth] Registro: ${usuario.correo} | Rol: ${nombre_rol}`);

    res.status(201).json({
      mensaje: `Bienvenido a MAGDA, ${usuario.nombre_completo}`,
      token,
      usuario: {
        id_usuario:      usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        correo:          usuario.correo,
        nombre_rol,
        creado_en:       usuario.creado_en
      }
    });
  } catch (err) {
    console.error('[ServicioAuth][register]', err.message);
    res.status(500).json({ error: 'Error al registrar: ' + err.message });
  }
});

/* ─────────────────────────────────────────────────────────────────────
   POST /api/auth/login
   Body: { correo, contrasena }
───────────────────────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena)
    return res.status(400).json({ error: 'Correo y contrasena son obligatorios' });

  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo, u.contrasena,
              u.activo, u.creado_en, u.id_rol, r.nombre_rol
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.correo = $1`,
      [correo.toLowerCase().trim()]
    );

    if (rows.length === 0)
      return res.status(401).json({ error: 'Correo o contrasena incorrectos' });

    const usuario = rows[0];
    if (!usuario.activo)
      return res.status(403).json({ error: 'Esta cuenta esta desactivada' });

    const valido = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!valido)
      return res.status(401).json({ error: 'Correo o contrasena incorrectos' });

    await pool.query(
      'INSERT INTO historial_accesos (id_usuario, direccion_ip, dispositivo) VALUES ($1, $2, $3)',
      [usuario.id_usuario, obtenerIP(req), obtenerDispositivo(req)]
    );

    const token = jwt.sign(
      {
        id:         usuario.id_usuario,
        correo:     usuario.correo,
        nombre:     usuario.nombre_completo,
        rol:        usuario.id_rol,
        nombre_rol: usuario.nombre_rol
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`[ServicioAuth] Login: ${usuario.correo} | Rol: ${usuario.nombre_rol}`);

    res.json({
      mensaje: `Bienvenido, ${usuario.nombre_completo}`,
      token,
      usuario: {
        id_usuario:      usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        correo:          usuario.correo,
        nombre_rol:      usuario.nombre_rol,
        creado_en:       usuario.creado_en
      }
    });
  } catch (err) {
    console.error('[ServicioAuth][login]', err.message);
    res.status(500).json({ error: 'Error al iniciar sesion: ' + err.message });
  }
});

/* ─────────────────────────────────────────────────────────────────────
   POST /api/auth/register-invidente
   Solo tutores pueden registrar invidentes a su cargo
   Header: Authorization: Bearer {token_tutor}
   Body: { nombre_completo, correo, contrasena }
───────────────────────────────────────────────────────────────────── */
router.post('/register-invidente', verificarToken, async (req, res) => {
  if (req.usuario.nombre_rol !== 'Tutor')
    return res.status(403).json({ error: 'Solo los tutores pueden registrar usuarios invidentes' });

  const { nombre_completo, correo, contrasena } = req.body;
  if (!nombre_completo || !correo || !contrasena)
    return res.status(400).json({ error: 'Nombre, correo y contrasena son obligatorios' });
  if (contrasena.length < 6)
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });

  try {
    const existe = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = $1', [correo.toLowerCase().trim()]
    );
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Este correo ya esta registrado' });

    const rolId = await resolverRol('invidente');
    const hash  = await bcrypt.hash(contrasena, 12);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre_completo, correo, contrasena, id_rol, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id_usuario, nombre_completo, correo, creado_en, id_rol`,
      [nombre_completo.trim(), correo.toLowerCase().trim(), hash, rolId]
    );
    const invidente = rows[0];

    // Vincular automáticamente al tutor
    await pool.query(
      `INSERT INTO tutor_usuarios (tutor_id, invidente_id) VALUES ($1, $2)
       ON CONFLICT (tutor_id, invidente_id) DO NOTHING`,
      [req.usuario.id, invidente.id_usuario]
    );

    console.log(`[ServicioAuth] Tutor ${req.usuario.id} registro invidente ${invidente.correo}`);

    res.status(201).json({
      mensaje: `Invidente ${invidente.nombre_completo} registrado y vinculado a su cuenta`,
      invidente: {
        id_usuario:      invidente.id_usuario,
        nombre_completo: invidente.nombre_completo,
        correo:          invidente.correo,
        creado_en:       invidente.creado_en
      }
    });
  } catch (err) {
    console.error('[ServicioAuth][register-invidente]', err.message);
    res.status(500).json({ error: 'Error al registrar invidente: ' + err.message });
  }
});

module.exports = router;
