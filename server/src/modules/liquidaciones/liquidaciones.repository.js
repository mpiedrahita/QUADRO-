import { pool } from '../../db/pool.js';

export async function insertarLiquidacion(grupoId, datos, registradoPor, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO liquidacion (grupo_id, emisor_id, receptor_id, importe, fecha, nota, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [grupoId, datos.emisorId, datos.receptorId, datos.importe, datos.fecha, datos.nota ?? null, registradoPor]
  );
  return rows[0].id;
}

export async function buscarLiquidacion(grupoId, liquidacionId, db = pool) {
  const { rows } = await db.query(
    `SELECT id, estado, registrado_por AS "registradoPorId" FROM liquidacion WHERE grupo_id = $1 AND id = $2`,
    [grupoId, liquidacionId]
  );
  return rows[0] ?? null;
}

export async function anularLiquidacion(liquidacionId, db = pool) {
  await db.query(`UPDATE liquidacion SET estado = 'ANULADA', fecha_anulacion = now() WHERE id = $1`, [liquidacionId]);
}
