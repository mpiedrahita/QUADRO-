import { pool } from '../../db/pool.js';

export async function listarCategorias(grupoId, db = pool) {
  const { rows } = await db.query(
    `SELECT c.id, c.nombre,
            (SELECT count(*)::int FROM gasto g WHERE g.categoria_id = c.id) AS "usos"
       FROM categoria c WHERE c.grupo_id = $1
      ORDER BY lower(c.nombre)`,
    [grupoId]
  );
  return rows;
}

export async function buscarCategoria(grupoId, categoriaId, db = pool) {
  const { rows } = await db.query(
    `SELECT c.id, c.nombre, (SELECT count(*)::int FROM gasto g WHERE g.categoria_id = c.id) AS "usos"
       FROM categoria c WHERE c.grupo_id = $1 AND c.id = $2`,
    [grupoId, categoriaId]
  );
  return rows[0] ?? null;
}

export async function buscarPorNombre(grupoId, nombre, db = pool) {
  const { rows } = await db.query(`SELECT id, nombre FROM categoria WHERE grupo_id = $1 AND lower(nombre) = lower($2)`, [grupoId, nombre]);
  return rows[0] ?? null;
}

export async function insertarCategoria(grupoId, nombre, db = pool) {
  const { rows } = await db.query(`INSERT INTO categoria (grupo_id, nombre) VALUES ($1, $2) RETURNING id, nombre`, [grupoId, nombre]);
  return { ...rows[0], usos: 0 };
}

export async function renombrarCategoria(categoriaId, nombre, db = pool) {
  await db.query(`UPDATE categoria SET nombre = $2 WHERE id = $1`, [categoriaId, nombre]);
}

export async function eliminarCategoria(categoriaId, db = pool) {
  await db.query(`DELETE FROM categoria WHERE id = $1`, [categoriaId]);
}
