/**
 * RF-08 · RF-17 · HU-06: saldos individuales, deudas entre integrantes y resumen del grupo.
 * Los saldos no se almacenan: se calculan siempre a partir de los movimientos vigentes,
 * por eso al editar o anular un gasto quedan recalculados automáticamente (RF-10).
 */
import { pool } from '../../db/pool.js';
import { calcularDeudas, calcularSaldos } from '../../domain/saldos.js';
import { listarParticipantes } from '../participantes/participantes.repository.js';
import { listarGastos, listarLiquidaciones } from './movimientos.repository.js';

/** Carga los movimientos vigentes de un grupo y calcula saldos y deudas. */
export async function calcularEstado(grupoId, db = pool) {
  // Consultas en secuencia: dentro de una transacción se comparte un único cliente de conexión.
  const participantes = await listarParticipantes(grupoId, { incluirRetirados: true }, db);
  const gastos = await listarGastos(grupoId, {}, db);
  const liquidaciones = await listarLiquidaciones(grupoId, { incluirAnuladas: false }, db);
  const saldos = calcularSaldos({
    participacionIds: participantes.filter((p) => p.estado === 'ACTIVA').map((p) => p.id),
    gastos,
    liquidaciones,
  });
  const deudas = calcularDeudas({ gastos, liquidaciones });
  return { participantes, gastos, liquidaciones, saldos, deudas };
}

export async function obtenerResumen(grupoId, miParticipacionId) {
  const { participantes, gastos, liquidaciones, saldos, deudas } = await calcularEstado(grupoId);
  const nombre = new Map(participantes.map((p) => [p.id, p.nombre]));

  const listaSaldos = participantes
    .filter((p) => saldos.has(p.id))
    .map((p) => ({
      participacionId: p.id,
      nombre: p.nombre,
      rol: p.rol,
      estado: p.estado,
      esUsted: p.id === miParticipacionId,
      ...saldos.get(p.id),
    }));

  const porCategoria = new Map();
  for (const g of gastos) {
    const actual = porCategoria.get(g.categoriaId) ?? { categoriaId: g.categoriaId, nombre: g.categoria, total: 0, cantidad: 0 };
    actual.total += g.importe;
    actual.cantidad += 1;
    porCategoria.set(g.categoriaId, actual);
  }

  const totalGastado = gastos.reduce((a, g) => a + g.importe, 0);
  return {
    resumen: {
      totalGastado,
      numeroGastos: gastos.length,
      totalLiquidado: liquidaciones.reduce((a, l) => a + l.importe, 0),
      numeroLiquidaciones: liquidaciones.length,
      deudaPendiente: deudas.reduce((a, d) => a + d.importe, 0),
      porCategoria: [...porCategoria.values()].sort((a, b) => b.total - a.total),
      hayMovimientos: gastos.length > 0 || liquidaciones.length > 0,
    },
    miSaldo: saldos.get(miParticipacionId) ?? { pagado: 0, asignado: 0, enviado: 0, recibido: 0, saldo: 0 },
    saldos: listaSaldos,
    deudas: deudas.map((d) => ({
      ...d,
      deudor: nombre.get(d.deudorId),
      acreedor: nombre.get(d.acreedorId),
    })),
  };
}
