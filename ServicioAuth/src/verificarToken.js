/* =====================================================================
   ServicioAuth — verificarToken.js
   Comparte el JWT_SECRET con ServicioMagda para validar tokens
   ===================================================================== */
require('dotenv').config();
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token expirado, vuelve a iniciar sesion' });
    return res.status(401).json({ error: 'Token invalido' });
  }
}

module.exports = verificarToken;
