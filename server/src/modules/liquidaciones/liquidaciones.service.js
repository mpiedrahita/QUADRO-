/**
 * RF-19 · HU-13 · CU-11 · Actividad 8.3: registro de liquidaciones (pagos entre integrantes).
 *
 * Reglas:
 *  - Emisor (quien paga) y receptor (quien recibe) deben ser integrantes activos y distintos.
 *  - Debe existir una deuda pendiente del emisor con el receptor y el importe no puede superarla.
 *  - Pueden registrarla el emisor, el receptor o el administrador del grupo.
 *  - Anular una liquidación la excluye de los saldos (la deuda vuelve a quedar pendiente).
 */
import { enTransaccion } from '../../db/pool.js';
import { deudaEntre } from '../../domain/saldos.js';
import { pesos } from '../../domain/reparto.js';
import { ErrorDominio, conflicto, noEncontrado, prohibido } from '../../utils/errores.js';
import { hoyISO } from '../../utils/fechas.js';
import { esAdministrador } from '../../middlewares/membresia.js';
import { bloquearGrupo } from '../grupos/grupos.repository.js';
import { listarParticipantes } from '../participantes/participantes.repository.js';
import { calcularEstado } from '../saldos/saldos.service.js';
import { listarLiquidaciones } from '../saldos/movimientos.repository.js';
import * as repo from './liquidaciones.repository.js';

export const listar = (grupoId) => listarLiquidaciones(grupoId);

async function obtenerCompleta(grupoId, liquidacionId, db) {
  const todas = await listarLiquidaciones(grupoId, {}, db);
  return todas.find((l) => l.id === liquidacionId);
}

export async function crear(grupoId, membresia, datos) {
  return enTransaccion(async (db) => {
    await bloquearGrupo(grupoId, db);
    if (datos.fecha > hoyISO()) throw new ErrorDominio('La fecha de la liquidación no puede ser posterior a hoy.', 'fecha');

    const activos = new Map((await listarParticipantes(grupoId, {}, db)).map((p) => [p.id, p]));
    const emisor = activos.get(datos.emisorId);
    const receptor = activos.get(datos.receptorId);
    if (!emisor) throw new ErrorDominio('Quien paga debe ser un integrante activo del grupo.', 'emisorId');
    if (!receptor) throw new ErrorDominio('Quien recibe debe ser un integrante activo del grupo.', 'receptorId');

    const involucrado = [datos.emisorId, datos.receptorId].includes(membresia.participacionId);
    if (!involucrado && !esAdministrador(membresia)) {
      throw prohibido('Solo los integrantes involucrados o el administrador pueden registrar esta liquidación.');
    }

    const { deudas } = await calcularEstado(grupoId, db);
    const pendiente = deudaEntre(deudas, datos.emisorId, datos.receptorId);
    if (pendiente === 0) {
      throw conflicto(`${emisor.nombre} no tiene una deuda pendiente con ${receptor.nombre}.`);
    }
    if (datos.importe > pendiente) {
      throw new ErrorDominio(`El importe supera la deuda pendiente (${pesos(pendiente)}).`, 'importe');
    }

    const id = await repo.insertarLiquidacion(grupoId, datos, membresia.participacionId, db);
    return obtenerCompleta(grupoId, id, db);
  });
}

export async function anular(grupoId, liquidacionId, membresia) {
  return enTransaccion(async (db) => {
    await bloquearGrupo(grupoId, db);
    const liquidacion = await repo.buscarLiquidacion(grupoId, liquidacionId, db);
    if (!liquidacion) throw noEncontrado('La liquidación no existe en este grupo.');
    if (liquidacion.registradoPorId !== membresia.participacionId && !esAdministrador(membresia)) {
      throw prohibido('Solo quien registró la liquidación o el administrador pueden anularla.');
    }
    if (liquidacion.estado === 'ANULADA') throw conflicto('La liquidación ya estaba anulada.');
    await repo.anularLiquidacion(liquidacionId, db);
    return obtenerCompleta(grupoId, liquidacionId, db);
  });
}
