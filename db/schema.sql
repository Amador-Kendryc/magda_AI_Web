-- =====================================================================
--  MAGDA × TINGO — Schema PostgreSQL
--  Arquitectura SOA | Unidad 3
--  Tablas: roles, usuarios, historial_accesos
-- =====================================================================

-- Limpiar si existe
DROP TABLE IF EXISTS historial_accesos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ── ROLES ──────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id_rol      SERIAL PRIMARY KEY,
  nombre_rol  VARCHAR(50)  NOT NULL UNIQUE,
  descripcion VARCHAR(255)
);

INSERT INTO roles (nombre_rol, descripcion) VALUES
  ('Usuario',        'Usuario estándar de la plataforma TINGO'),
  ('Administrador',  'Administrador con acceso completo al sistema'),
  ('Invidente',      'Usuario con discapacidad visual — acceso prioritario');

-- ── USUARIOS ────────────────────────────────────────────────────────────
CREATE TABLE usuarios (
  id_usuario      SERIAL PRIMARY KEY,
  id_rol          INT          NOT NULL REFERENCES roles(id_rol) DEFAULT 1,
  nombre_completo VARCHAR(100) NOT NULL,
  correo          VARCHAR(100) NOT NULL UNIQUE,
  contrasena      VARCHAR(255) NOT NULL,   -- bcrypt hash
  creado_en       TIMESTAMP    DEFAULT NOW(),
  activo          BOOLEAN      DEFAULT TRUE
);

CREATE INDEX idx_usuarios_correo ON usuarios(correo);

-- ── HISTORIAL_ACCESOS ────────────────────────────────────────────────────
CREATE TABLE historial_accesos (
  id_acceso    SERIAL PRIMARY KEY,
  id_usuario   INT         NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  fecha_ingreso TIMESTAMP  DEFAULT NOW(),
  direccion_ip  VARCHAR(45),
  dispositivo   VARCHAR(255)
);

CREATE INDEX idx_historial_usuario ON historial_accesos(id_usuario);
CREATE INDEX idx_historial_fecha   ON historial_accesos(fecha_ingreso DESC);
