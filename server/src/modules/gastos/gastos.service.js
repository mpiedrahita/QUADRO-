/**
 * RF-05 · RF-06 · RF-07 · RF-10 · RF-12 · HU-04 · HU-05 · HU-07 · HU-09
 * Registro, distribución, edición, anulación y consulta de gastos.
 *
 * Ciclo de vida (diagrama de estados del Entregable 2):
 *   [En edición] --guardar(datos válidos)--> REGISTRADO --editar--> MODIFICADO
 *   REGISTRADO | MODIFICADO --anular--> ANULADO (eliminación lógica, sale de los saldos)
 */
import { enTransaccion } from '../../db/pool.js';
import { calcularReparto } from '../../domain/reparto.js';
import { ErrorDominio, conflicto, noEncontrado, prohibido } from '../../utils/errores.js';
import { hoyISO } from '../../utils/fechas.js';
import { esAdministrador } from '../../middlewares/membresia.js';
import { buscarCategoria } from '../categorias/categorias.repository.js';
import { bloquearGrupo } from '../grupos/grupos.repository.js';
import { listarParticipantes } from '../participantes/participantes.repository.js';
import { listarGastos } from '../saldos/movimientos.repository.js';
import * as repo from './gastos.repository.js';

/** Valida las reglas que dependen del grupo y calcula el reparto. */
async function prepararGasto(grupoId, datos, db) {
  if (datos.fecha > hoyISO()) throw new ErrorDominio('La fecha del gasto no puede ser posterior a hoy.', 'fecha');

  const categoria = await buscarCategoria(grupoId, datos.categoriaId, db);
  if (!categoria) throw new ErrorDominio('La categoría seleccionada no pertenece a este grupo.', 'categoriaId');

  const activos = await listarParticipantes(grupoId, {}, db);
  const orden = new Map(activos.map((p, i) => [p.id, i]));
  if (!orden.has(datos.pagadorId)) {
    throw new ErrorDominio('Quien pagó debe ser un integrante activo del grupo.', 'pagadorId');
  }
  if (datos.repartos.some((r) => !orden.has(r.participacionId))) {
    throw new ErrorDominio('Todos los participantes del reparto deben ser integrantes activos del grupo.', 'repartos');
  }
  // El orden de ingreso al grupo define a quién se asignan los pesos sobrantes del redondeo.
  const participantes = [...datos.repartos].sort((a, b) => orden.get(a.participacionId) - orden.get(b.participacionId));
  return calcularReparto({ importe: datos.importe, metodo: datos.metodo, participantes });
}

async function obtenerGastoCompleto(grupoId, gastoId, db) {
  const [gasto] = await listarGastos(grupoId, { gastoId }, db);
  if (!gasto) throw noEncontrado('El gasto no existe en este grupo.');
  return gasto;
}

/** RNF-02: solo quien registró el gasto o el administrador pueden modificarlo o anularlo. */
function verificarPermiso(gasto, membresia, accion) {
  if (gasto.registradoPorId !== membresia.participacionId && !esAdministrador(membresia)) {
    throw prohibido(`Solo quien registró el gasto o el administrador del grupo pueden ${accion}lo.`);
  }
}

export async function listar(grupoId, filtros) {
  return listarGastos(grupoId, filtros);
}

export async function obtener(grupoId, gastoId) {
  return obtenerGastoCompleto(grupoId, gastoId);
}

/** DS-02: el gasto y sus repartos se guardan juntos en una sola transacción. */
export async function crear(grupoId, membresia, datos) {
  return enTransaccion(async (db) => {
    await bloquearGrupo(grupoId, db);
    const repartos = await prepararGasto(grupoId, datos, db);
    const gastoId = await repo.insertarGasto(grupoId, datos, membresia.participacionId, db);
    await repo.insertarRepartos(gastoId, repartos, db);
    return obtenerGastoCompleto(grupoId, gastoId, db);
  });
}

export async function actualizar(grupoId, gastoId, membresia, datos) {
  return enTransaccion(async (db) => {
    await bloquearGrupo(grupoId, db);
    const gasto = await repo.buscarGasto(grupoId, gastoId, db);
    if (!gasto) throw noEncontrado('El gasto no existe en este grupo.');
    verificarPermiso(gasto, membresia, 'modificar');
    if (gasto.estado === 'ANULADO') throw conflicto('Un gasto anulado no puede modificarse.');
    const repartos = await prepararGasto(grupoId, datos, db);
    await repo.actualizarGasto(gastoId, datos, db);
    await repo.eliminarRepartos(gastoId, db);
    await repo.insertarRepartos(gastoId, repartos, db);
    return obtenerGastoCompleto(grupoId, gastoId, db);
  });
}

export async function anular(grupoId, gastoId, membresia) {
  return enTransaccion(async (db) => {
    await bloquearGrupo(grupoId, db);
    const gasto = await repo.buscarGasto(grupoId, gastoId, db);
    if (!gasto) throw noEncontrado('El gasto no existe en este grupo.');
    verificarPermiso(gasto, membresia, 'anular');
    if (gasto.estado === 'ANULADO') throw conflicto('El gasto ya estaba anulado.');
    await repo.anularGasto(gastoId, db);
    return obtenerGastoCompleto(grupoId, gastoId, db);
  });
}
