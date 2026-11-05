import { pool } from '../../db/pool.js';

const columnas = `p.id, p.usuario_id AS "usuarioId", u.nombre, u.correo, p.rol, p.estado,
                  p.fecha_ingreso AS "fechaIngreso", p.fecha_retiro AS "fechaRetiro"`;

/** Participantes del grupo en orden de ingreso (este orden se usa para el redondeo del reparto). */
export async function listarParticipantes(grupoId, { incluirRetirados = false } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT ${columnas}
       FROM participacion p JOIN usuario u ON u.id = p.usuario_id
      WHERE p.grupo_id = $1 ${incluirRetirados ? '' : "AND p.estado = 'ACTIVA'"}
      ORDER BY p.fecha_ingreso, u.nombre`,
    [grupoId]
  );
  return rows;
}

export async function buscarParticipacion(grupoId, participacionId, db = pool) {
  const { rows } = await db.query(
    `SELECT ${columnas} FROM participacion p JOIN usuario u ON u.id = p.usuario_id
      WHERE p.grupo_id = $1 AND p.id = $2`,
    [grupoId, participacionId]
  );
  return rows[0] ?? null;
}

export async function buscarParticipacionDeUsuario(grupoId, usuarioId, db = pool) {
  const { rows } = await db.query(
    `SELECT ${columnas} FROM participacion p JOIN usuario u ON u.id = p.usuario_id
      WHERE p.grupo_id = $1 AND p.usuario_id = $2`,
    [grupoId, usuarioId]
  );
  return rows[0] ?? null;
}

export async function insertarParticipacion({ grupoId, usuarioId, rol }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO participacion (grupo_id, usuario_id, rol) VALUES ($1, $2, $3) RETURNING id`,
    [grupoId, usuarioId, rol]
  );
  return rows[0];
}

export async function reactivarParticipacion(participacionId, db = pool) {
  await db.query(
    `UPDATE participacion SET estado = 'ACTIVA', rol = 'INTEGRANTE', fecha_ingreso = now(), fecha_retiro = NULL WHERE id = $1`,
    [participacionId]
  );
}

export async function retirarParticipacion(participacionId, db = pool) {
  await db.query(`UPDATE participacion SET estado = 'RETIRADA', fecha_retiro = now() WHERE id = $1`, [participacionId]);
}
