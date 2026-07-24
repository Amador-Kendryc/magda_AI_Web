-- =====================================================================
--  MAGDA × TINGO — Migración v2 (ADITIVA, sin DROP)
--  Nuevas tablas: tutor_usuarios, viajes, evaluaciones_viaje
--  Nuevo rol: Tutor
--  Ejecutar sobre la BD existente
-- =====================================================================

-- ── ROL TUTOR (si no existe) ─────────────────────────────────────────
INSERT INTO roles (nombre_rol, descripcion)
VALUES ('Tutor', 'Persona sighted que supervisa y acompaña a usuarios invidentes')
ON CONFLICT (nombre_rol) DO NOTHING;

-- ── TUTOR_USUARIOS — Relación 1 Tutor → N Invidentes ─────────────────
CREATE TABLE IF NOT EXISTS tutor_usuarios (
  id             SERIAL PRIMARY KEY,
  tutor_id       INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  invidente_id   INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  vinculado_en   TIMESTAMP DEFAULT NOW(),
  activo         BOOLEAN DEFAULT TRUE,
  UNIQUE (tutor_id, invidente_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_usuarios_tutor
  ON tutor_usuarios(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_usuarios_invidente
  ON tutor_usuarios(invidente_id);

-- ── VIAJES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS viajes (
  id_viaje     SERIAL PRIMARY KEY,
  invidente_id INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  tutor_id     INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  fecha_viaje  TIMESTAMP DEFAULT NOW(),
  origen       VARCHAR(255),
  destino      VARCHAR(255),
  notas        TEXT
);

CREATE INDEX IF NOT EXISTS idx_viajes_invidente ON viajes(invidente_id);
CREATE INDEX IF NOT EXISTS idx_viajes_tutor     ON viajes(tutor_id);
CREATE INDEX IF NOT EXISTS idx_viajes_fecha     ON viajes(fecha_viaje DESC);

-- ── EVALUACIONES_VIAJE — Encuesta de 5 preguntas ─────────────────────
CREATE TABLE IF NOT EXISTS evaluaciones_viaje (
  id_evaluacion          SERIAL PRIMARY KEY,
  tutor_id               INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  invidente_id           INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_viaje               INT REFERENCES viajes(id_viaje) ON DELETE SET NULL,
  fecha_evaluacion       TIMESTAMP DEFAULT NOW(),
  -- P1: Nivel de autonomía y necesidad de asistencia
  p1_autonomia           TEXT,
  -- P2: Factores ambientales y puntos de fricción
  p2_factores_ambientales TEXT,
  -- P3: Confianza y percepción de seguridad
  p3_confianza           TEXT,
  -- P4: Claridad en respuestas y tiempos del sistema
  p4_claridad_latencia   TEXT,
  -- P5: Viabilidad para la independencia a futuro
  p5_viabilidad_futura   TEXT
);

CREATE INDEX IF NOT EXISTS idx_eval_tutor     ON evaluaciones_viaje(tutor_id);
CREATE INDEX IF NOT EXISTS idx_eval_invidente ON evaluaciones_viaje(invidente_id);
CREATE INDEX IF NOT EXISTS idx_eval_fecha     ON evaluaciones_viaje(fecha_evaluacion DESC);
