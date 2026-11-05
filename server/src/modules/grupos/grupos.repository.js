import { pool } from '../../db/pool.js';

export const CATEGORIAS_BASE = ['Materia prima', 'Insumos', 'Transporte', 'Herramientas', 'Servicios', 'Otros'];

export async function insertarGrupo({ nombre, descripcion, creadoPor }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO grupo (nombre, descripcion, creado_por) VALUES ($1, $2, $3)
     RETURNING id, nombre, descripcion, estado, fecha_creacion AS "fechaCreacion"`,
    [nombre, descripcion ?? null, creadoPor]
  );
  return rows[0];
}

export async function insertarCategoriasBase(grupoId, db = pool) {
  await db.query(
    `INSERT INTO categoria (grupo_id, nombre) SELECT $1, unnest($2::text[])`,
    [grupoId, CATEGORIAS_BASE]
  );
}

/** Participación ACTIVA del usuario en el grupo (o null). */
export async function buscarMembresia(grupoId, usuarioId, db = pool) {
  const { rows } = await db.query(
    `SELECT p.id AS "participacionId", p.rol, p.grupo_id AS "grupoId"
       FROM participacion p
       JOIN grupo g ON g.id = p.grupo_id
      WHERE p.grupo_id = $1 AND p.usuario_id = $2 AND p.estado = 'ACTIVA'`,
    [grupoId, usuarioId]
  );
  return rows[0] ?? null;
}

/** Grupos en los que el usuario participa activamente, con datos de resumen. */
export async function listarGruposDeUsuario(usuarioId, db = pool) {
  const { rows } = await db.query(
    `SELECT g.id, g.nombre, g.descripcion, g.estado, g.fecha_creacion AS "fechaCreacion",
            p.id AS "miParticipacionId", p.rol AS "miRol",
            (SELECT count(*)::int FROM participacion x WHERE x.grupo_id = g.id AND x.estado = 'ACTIVA') AS integrantes,
            (SELECT count(*)::int FROM gasto x WHERE x.grupo_id = g.id AND x.estado <> 'ANULADO') AS "numeroGastos",
            (SELECT COALESCE(SUM(x.importe), 0) FROM gasto x WHERE x.grupo_id = g.id AND x.estado <> 'ANULADO') AS "totalGastado"
       FROM grupo g
       JOIN participacion p ON p.grupo_id = g.id AND p.usuario_id = $1 AND p.estado = 'ACTIVA'
      ORDER BY g.fecha_creacion DESC`,
    [usuarioId]
  );
  return rows;
}

export async function obtenerGrupo(grupoId, db = pool) {
  const { rows } = await db.query(
    `SELECT g.id, g.nombre, g.descripcion, g.estado, g.fecha_creacion AS "fechaCreacion",
            u.nombre AS "creadoPor"
       FROM grupo g JOIN usuario u ON u.id = g.creado_por
      WHERE g.id = $1`,
    [grupoId]
  );
  return rows[0] ?? null;
}

export async function actualizarGrupo(grupoId, { nombre, descripcion }, db = pool) {
  const { rows } = await db.query(
    `UPDATE grupo SET nombre = $2, descripcion = $3 WHERE id = $1
     RETURNING id, nombre, descripcion, estado, fecha_creacion AS "fechaCreacion"`,
    [grupoId, nombre, descripcion ?? null]
  );
  return rows[0];
}

/** Bloquea la fila del grupo durante una transacción para serializar operaciones que afectan saldos. */
export async function bloquearGrupo(grupoId, db) {
  await db.query('SELECT id FROM grupo WHERE id = $1 FOR UPDATE', [grupoId]);
}
