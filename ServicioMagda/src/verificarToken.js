/* =====================================================================
   ServicioMagda — verificarToken.js
   Middleware JWT: verifica tokens emitidos por ServicioAuth
   El mismo JWT_SECRET permite validar sin llamar a ServicioAuth
   ===================================================================== */
require('dotenv').config();
const jwt = require('jsonwebtoken');

/**
 * Middleware de verificación de token JWT
 * Uso: router.get('/ruta', verificarToken, handler)
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Acceso denegado — token requerido',
      hint:  'Incluye el header: Authorization: Bearer {token}'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario   = decoded;  // { id, correo, nombre, rol, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado — vuelve a iniciar sesión' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = verificarToken;
