import { enTransaccion } from '../../db/pool.js';
import { noEncontrado } from '../../utils/errores.js';
import { insertarParticipacion } from '../participantes/participantes.repository.js';
import { calcularEstado } from '../saldos/saldos.service.js';
import * as repo from './grupos.repository.js';

/**
 * RF-03 · HU-02 · DS-01: crea el grupo, la participación del creador como
 * ADMINISTRADOR y las categorías base, todo en una sola transacción.
 */
export async function crearGrupo(usuarioId, { nombre, descripcion }) {
  return enTransaccion(async (db) => {
    const grupo = await repo.insertarGrupo({ nombre, descripcion, creadoPor: usuarioId }, db);
    const participacion = await insertarParticipacion({ grupoId: grupo.id, usuarioId, rol: 'ADMINISTRADOR' }, db);
    await repo.insertarCategoriasBase(grupo.id, db);
    return { ...grupo, miRol: 'ADMINISTRADOR', miParticipacionId: participacion.id, integrantes: 1 };
  });
}

/** Grupos del usuario con su saldo personal en cada uno. */
export async function listarMisGrupos(usuarioId) {
  const grupos = await repo.listarGruposDeUsuario(usuarioId);
  return Promise.all(
    grupos.map(async (g) => {
      const { saldos } = await calcularEstado(g.id);
      return { ...g, miSaldo: saldos.get(g.miParticipacionId)?.saldo ?? 0 };
    })
  );
}

export async function obtenerDetalle(grupoId, membresia) {
  const grupo = await repo.obtenerGrupo(grupoId);
  if (!grupo) throw noEncontrado('El grupo no existe o no perteneces a él.');
  return { ...grupo, miRol: membresia.rol, miParticipacionId: membresia.participacionId };
}

export async function actualizarGrupo(grupoId, datos, membresia) {
  const grupo = await repo.actualizarGrupo(grupoId, datos);
  return { ...grupo, miRol: membresia.rol, miParticipacionId: membresia.participacionId };
}
