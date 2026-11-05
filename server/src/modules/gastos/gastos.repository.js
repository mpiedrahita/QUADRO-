import { pool } from '../../db/pool.js';

export async function buscarGasto(grupoId, gastoId, db = pool) {
  const { rows } = await db.query(
    `SELECT id, estado, registrado_por AS "registradoPorId" FROM gasto WHERE grupo_id = $1 AND id = $2`,
    [grupoId, gastoId]
  );
  return rows[0] ?? null;
}

export async function insertarGasto(grupoId, datos, registradoPor, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO gasto (grupo_id, descripcion, importe, fecha, categoria_id, pagador_id, metodo_distribucion, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [grupoId, datos.descripcion, datos.importe, datos.fecha, datos.categoriaId, datos.pagadorId, datos.metodo, registradoPor]
  );
  return rows[0].id;
}

export async function actualizarGasto(gastoId, datos, db = pool) {
  await db.query(
    `UPDATE gasto SET descripcion = $2, importe = $3, fecha = $4, categoria_id = $5, pagador_id = $6,
            metodo_distribucion = $7, estado = 'MODIFICADO', fecha_modificacion = now()
      WHERE id = $1`,
    [gastoId, datos.descripcion, datos.importe, datos.fecha, datos.categoriaId, datos.pagadorId, datos.metodo]
  );
}

export async function anularGasto(gastoId, db = pool) {
  await db.query(`UPDATE gasto SET estado = 'ANULADO', fecha_anulacion = now() WHERE id = $1`, [gastoId]);
}

/** Inserta todos los repartos de un gasto en una sola sentencia. */
export async function insertarRepartos(gastoId, repartos, db = pool) {
  await db.query(
    `INSERT INTO reparto_gasto (gasto_id, participacion_id, importe_asignado, porcentaje)
     SELECT $1, * FROM unnest($2::uuid[], $3::int[], $4::numeric[])`,
    [gastoId, repartos.map((r) => r.participacionId), repartos.map((r) => r.importeAsignado), repartos.map((r) => r.porcentaje)]
  );
}

export async function eliminarRepartos(gastoId, db = pool) {
  await db.query(`DELETE FROM reparto_gasto WHERE gasto_id = $1`, [gastoId]);
}
