import { buscarMembresia } from '../modules/grupos/grupos.repository.js';
import { noEncontrado, prohibido } from '../utils/errores.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RNF-04: los datos de un grupo solo son visibles para sus integrantes activos.
 * Carga en req.membresia la participación del usuario en el grupo de la ruta.
 * Si el usuario no pertenece al grupo se responde 404 para no revelar que el grupo existe.
 */
export async function requiereMembresia(req, _res, next) {
  const { grupoId } = req.params;
  if (!UUID.test(grupoId ?? '')) throw noEncontrado('El grupo no existe o no perteneces a él.');
  const membresia = await buscarMembresia(grupoId, req.usuario.id);
  if (!membresia) throw noEncontrado('El grupo no existe o no perteneces a él.');
  req.membresia = membresia;
  next();
}

/** RNF-02 / RF-04: acciones reservadas al administrador del grupo. */
export function requiereAdministrador(req, _res, next) {
  if (req.membresia?.rol !== 'ADMINISTRADOR') {
    return next(prohibido('Solo el administrador del grupo puede realizar esta acción.'));
  }
  next();
}

export const esAdministrador = (membresia) => membresia?.rol === 'ADMINISTRADOR';
