import { pool } from '../../db/pool.js';

const metadatos = `c.id, c.nombre_archivo AS "nombreArchivo", c.tipo_mime AS "tipoMime", c.tamano_bytes AS "tamanoBytes",
                   c.subido_por AS "subidoPorId", u.nombre AS "subidoPor", c.fecha_subida AS "fechaSubida"`;

export async function listarComprobantes(gastoId, db = pool) {
  const { rows } = await db.query(
    `SELECT ${metadatos}
       FROM comprobante c JOIN participacion p ON p.id = c.subido_por JOIN usuario u ON u.id = p.usuario_id
      WHERE c.gasto_id = $1 ORDER BY c.fecha_subida`,
    [gastoId]
  );
  return rows;
}

export async function contarComprobantes(gastoId, db = pool) {
  const { rows } = await db.query(`SELECT count(*)::int AS total FROM comprobante WHERE gasto_id = $1`, [gastoId]);
  return rows[0].total;
}

export async function insertarComprobante({ gastoId, nombreArchivo, tipoMime, contenido, subidoPor }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO comprobante (gasto_id, nombre_archivo, tipo_mime, tamano_bytes, contenido, subido_por)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [gastoId, nombreArchivo, tipoMime, contenido.length, contenido, subidoPor]
  );
  return rows[0].id;
}

export async function buscarComprobante(gastoId, comprobanteId, { conContenido = false } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT ${metadatos} ${conContenido ? ', c.contenido' : ''}
       FROM comprobante c JOIN participacion p ON p.id = c.subido_por JOIN usuario u ON u.id = p.usuario_id
      WHERE c.gasto_id = $1 AND c.id = $2`,
    [gastoId, comprobanteId]
  );
  return rows[0] ?? null;
}

export async function eliminarComprobante(comprobanteId, db = pool) {
  await db.query(`DELETE FROM comprobante WHERE id = $1`, [comprobanteId]);
}
