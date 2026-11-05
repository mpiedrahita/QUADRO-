/**
 * Consultas de los movimientos de un grupo (gastos con sus repartos y liquidaciones)
 * que alimentan el cálculo de saldos y el historial.
 */
import { pool } from '../../db/pool.js';

/**
 * Lista gastos del grupo con sus repartos.
 * @param {string} grupoId
 * @param {{desde?: string, hasta?: string, categoriaId?: string, participanteId?: string, incluirAnulados?: boolean, gastoId?: string}} filtros
 */
export async function listarGastos(grupoId, filtros = {}, db = pool) {
  const condiciones = ['g.grupo_id = $1'];
  const valores = [grupoId];
  // Agrega una condición; cada "?" se reemplaza por el mismo parámetro posicional.
  const agregar = (sql, valor) => {
    valores.push(valor);
    condiciones.push(sql.replaceAll('?', `$${valores.length}`));
  };
  if (filtros.gastoId) agregar('g.id = ?', filtros.gastoId);
  if (!filtros.incluirAnulados && !filtros.gastoId) condiciones.push("g.estado <> 'ANULADO'");
  if (filtros.desde) agregar('g.fecha >= ?', filtros.desde);
  if (filtros.hasta) agregar('g.fecha <= ?', filtros.hasta);
  if (filtros.categoriaId) agregar('g.categoria_id = ?', filtros.categoriaId);
  if (filtros.participanteId) {
    agregar(
      '(g.pagador_id = ? OR EXISTS (SELECT 1 FROM reparto_gasto r WHERE r.gasto_id = g.id AND r.participacion_id = ?))',
      filtros.participanteId
    );
  }

  const { rows: gastos } = await db.query(
    `SELECT g.id, g.descripcion, g.importe, g.fecha, g.metodo_distribucion AS metodo, g.estado,
            g.categoria_id AS "categoriaId", c.nombre AS categoria,
            g.pagador_id AS "pagadorId", up.nombre AS pagador,
            g.registrado_por AS "registradoPorId", ur.nombre AS "registradoPor",
            g.fecha_registro AS "fechaRegistro", g.fecha_modificacion AS "fechaModificacion",
            g.fecha_anulacion AS "fechaAnulacion",
            (SELECT count(*)::int FROM comprobante cp WHERE cp.gasto_id = g.id) AS comprobantes
       FROM gasto g
       JOIN categoria c ON c.id = g.categoria_id
       JOIN participacion pp ON pp.id = g.pagador_id JOIN usuario up ON up.id = pp.usuario_id
       JOIN participacion pr ON pr.id = g.registrado_por JOIN usuario ur ON ur.id = pr.usuario_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY g.fecha DESC, g.fecha_registro DESC`,
    valores
  );
  if (gastos.length === 0) return [];

  const { rows: repartos } = await db.query(
    `SELECT r.gasto_id AS "gastoId", r.participacion_id AS "participacionId", u.nombre,
            r.importe_asignado AS "importeAsignado", r.porcentaje
       FROM reparto_gasto r
       JOIN participacion p ON p.id = r.participacion_id JOIN usuario u ON u.id = p.usuario_id
      WHERE r.gasto_id = ANY($1::uuid[])
      ORDER BY p.fecha_ingreso, u.nombre`,
    [gastos.map((g) => g.id)]
  );
  const porGasto = new Map(gastos.map((g) => [g.id, []]));
  for (const { gastoId, ...reparto } of repartos) porGasto.get(gastoId).push(reparto);
  return gastos.map((g) => ({ ...g, repartos: porGasto.get(g.id) }));
}

export async function listarLiquidaciones(grupoId, { incluirAnuladas = true } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT l.id, l.importe, l.fecha, l.nota, l.estado,
            l.emisor_id AS "emisorId", ue.nombre AS emisor,
            l.receptor_id AS "receptorId", ux.nombre AS receptor,
            l.registrado_por AS "registradoPorId", ur.nombre AS "registradoPor",
            l.fecha_registro AS "fechaRegistro", l.fecha_anulacion AS "fechaAnulacion"
       FROM liquidacion l
       JOIN participacion pe ON pe.id = l.emisor_id JOIN usuario ue ON ue.id = pe.usuario_id
       JOIN participacion px ON px.id = l.receptor_id JOIN usuario ux ON ux.id = px.usuario_id
       JOIN participacion pr ON pr.id = l.registrado_por JOIN usuario ur ON ur.id = pr.usuario_id
      WHERE l.grupo_id = $1 ${incluirAnuladas ? '' : "AND l.estado = 'REGISTRADA'"}
      ORDER BY l.fecha DESC, l.fecha_registro DESC`,
    [grupoId]
  );
  return rows;
}
