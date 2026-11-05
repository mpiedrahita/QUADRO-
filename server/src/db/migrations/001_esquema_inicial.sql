-- ============================================================
-- Quadro · Migración 001 · Esquema inicial del MVP
-- Basado en el diagrama de clases del Entregable 2 (Usuario, Grupo,
-- Participacion, Gasto, RepartoGasto, Liquidacion), complementado con
-- Categoria (RF-11) y Comprobante (RF-09).
-- Los importes se guardan en pesos colombianos enteros (sin centavos).
-- ============================================================

CREATE TABLE usuario (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           VARCHAR(80)  NOT NULL,
  correo           VARCHAR(120) NOT NULL,
  contrasena_hash  TEXT         NOT NULL,
  fecha_registro   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT usuario_correo_unico UNIQUE (correo),
  CONSTRAINT usuario_correo_minusculas CHECK (correo = lower(correo))
);

CREATE TABLE grupo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(80)  NOT NULL CHECK (length(trim(nombre)) >= 3),
  descripcion     VARCHAR(255),
  estado          VARCHAR(12)  NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'ARCHIVADO')),
  creado_por      UUID         NOT NULL REFERENCES usuario(id),
  fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Pertenencia de un usuario a un grupo (con atributos propios de la relación).
CREATE TABLE participacion (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       UUID        NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  usuario_id     UUID        NOT NULL REFERENCES usuario(id),
  rol            VARCHAR(15) NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'INTEGRANTE')),
  estado         VARCHAR(10) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'RETIRADA')),
  fecha_ingreso  TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_retiro   TIMESTAMPTZ,
  CONSTRAINT participacion_unica UNIQUE (grupo_id, usuario_id)
);
CREATE INDEX participacion_usuario_idx ON participacion (usuario_id);

CREATE TABLE categoria (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id   UUID        NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  nombre     VARCHAR(40) NOT NULL CHECK (length(trim(nombre)) >= 2),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categoria_nombre_unico ON categoria (grupo_id, lower(nombre));

CREATE TABLE gasto (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id             UUID         NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  descripcion          VARCHAR(120) NOT NULL CHECK (length(trim(descripcion)) >= 3),
  importe              INTEGER      NOT NULL CHECK (importe > 0),
  fecha                DATE         NOT NULL,
  categoria_id         UUID         NOT NULL REFERENCES categoria(id),
  pagador_id           UUID         NOT NULL REFERENCES participacion(id),
  metodo_distribucion  VARCHAR(12)  NOT NULL CHECK (metodo_distribucion IN ('IGUAL', 'PORCENTAJE', 'VALOR')),
  estado               VARCHAR(12)  NOT NULL DEFAULT 'REGISTRADO' CHECK (estado IN ('REGISTRADO', 'MODIFICADO', 'ANULADO')),
  registrado_por       UUID         NOT NULL REFERENCES participacion(id),
  fecha_registro       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_modificacion   TIMESTAMPTZ,
  fecha_anulacion      TIMESTAMPTZ
);
CREATE INDEX gasto_grupo_fecha_idx ON gasto (grupo_id, fecha DESC);

-- Parte de un gasto asignada a una participación.
CREATE TABLE reparto_gasto (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id          UUID         NOT NULL REFERENCES gasto(id) ON DELETE CASCADE,
  participacion_id  UUID         NOT NULL REFERENCES participacion(id),
  importe_asignado  INTEGER      NOT NULL CHECK (importe_asignado >= 0),
  porcentaje        NUMERIC(5,2) CHECK (porcentaje IS NULL OR (porcentaje > 0 AND porcentaje <= 100)),
  CONSTRAINT reparto_unico UNIQUE (gasto_id, participacion_id)
);
CREATE INDEX reparto_participacion_idx ON reparto_gasto (participacion_id);

-- Pago de una deuda entre dos integrantes del mismo grupo.
CREATE TABLE liquidacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id        UUID         NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  emisor_id       UUID         NOT NULL REFERENCES participacion(id),
  receptor_id     UUID         NOT NULL REFERENCES participacion(id),
  importe         INTEGER      NOT NULL CHECK (importe > 0),
  fecha           DATE         NOT NULL,
  nota            VARCHAR(120),
  estado          VARCHAR(12)  NOT NULL DEFAULT 'REGISTRADA' CHECK (estado IN ('REGISTRADA', 'ANULADA')),
  registrado_por  UUID         NOT NULL REFERENCES participacion(id),
  fecha_registro  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_anulacion TIMESTAMPTZ,
  CONSTRAINT liquidacion_partes_distintas CHECK (emisor_id <> receptor_id)
);
CREATE INDEX liquidacion_grupo_idx ON liquidacion (grupo_id, fecha DESC);

-- Comprobante (archivo) asociado a un gasto. Se guarda en la base de datos
-- para que persista aunque el servidor se redespliegue.
CREATE TABLE comprobante (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id        UUID         NOT NULL REFERENCES gasto(id) ON DELETE CASCADE,
  nombre_archivo  VARCHAR(150) NOT NULL,
  tipo_mime       VARCHAR(50)  NOT NULL CHECK (tipo_mime IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  tamano_bytes    INTEGER      NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 2097152),
  contenido       BYTEA        NOT NULL,
  subido_por      UUID         NOT NULL REFERENCES participacion(id),
  fecha_subida    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX comprobante_gasto_idx ON comprobante (gasto_id);
