/**
 * RF-04 · HU-03: gestión de participantes del grupo.
 * Un participante se agrega con el correo de una cuenta ya registrada en Quadro.
 * Retirar a un integrante es una baja lógica: su historial se conserva.
 */
import { enTransaccion } from '../../db/pool.js';
import { pesos } from '../../domain/reparto.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../../utils/errores.js';
import { buscarPorCorreo } from '../auth/usuarios.repository.js';
import { bloquearGrupo } from '../grupos/grupos.repository.js';
import { calcularEstado } from '../saldos/saldos.service.js';
import * as repo from './participantes.repository.js';

export async function listar(grupoId, { incluirRetirados }) {
  return repo.listarParticipantes(grupoId, { incluirRetirados });
}

export async function agregar(grupoId, correo) {
  const usuario = await buscarPorCorreo(correo);
  if (!usuario) {
    throw noEncontrado('No hay ninguna cuenta de Quadro con ese correo. Pídele a la persona que se registre primero.', {
      campos: { correo: 'Este correo no está registrado en Quadro.' },
    });
  }
  return enTransaccion(async (db) => {
    const existente = await repo.buscarParticipacionDeUsuario(grupoId, usuario.id, db);
    if (existente?.estado === 'ACTIVA') {
      throw conflicto(`${usuario.nombre} ya es integrante de este grupo.`, { campos: { correo: 'Ya es integrante del grupo.' } });
    }
    let id;
    if (existente) {
      await repo.reactivarParticipacion(existente.id, db);
      id = existente.id;
    } else {
      ({ id } = await repo.insertarParticipacion({ grupoId, usuarioId: usuario.id, rol: 'INTEGRANTE' }, db));
    }
    return repo.buscarParticipacion(grupoId, id, db);
  });
}

export async function retirar(grupoId, participacionId) {
  return enTransaccion(async (db) => {
    await bloquearGrupo(grupoId, db);
    const participante = await repo.buscarParticipacion(grupoId, participacionId, db);
    if (!participante) throw noEncontrado('El participante no existe en este grupo.');
    if (participante.estado === 'RETIRADA') throw conflicto(`${participante.nombre} ya fue retirado del grupo.`);
    if (participante.rol === 'ADMINISTRADOR') throw solicitudInvalida('No es posible retirar al administrador del grupo.');

    const { saldos, deudas } = await calcularEstado(grupoId, db);
    const pendientes = deudas.filter((d) => d.deudorId === participacionId || d.acreedorId === participacionId);
    if (pendientes.length > 0) {
      const saldo = saldos.get(participacionId)?.saldo ?? 0;
      throw conflicto(
        `${participante.nombre} tiene cuentas pendientes (saldo ${pesos(saldo)}). Registra las liquidaciones antes de retirarlo.`,
        { saldo }
      );
    }
    await repo.retirarParticipacion(participacionId, db);
    return { ...participante, estado: 'RETIRADA' };
  });
}
