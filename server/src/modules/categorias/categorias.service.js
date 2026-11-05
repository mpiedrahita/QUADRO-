/**
 * RF-11 · HU-10: categorías de gastos por grupo.
 * Reglas: nombre de 2 a 40 caracteres, único dentro del grupo (sin distinguir mayúsculas)
 * y solo se puede eliminar una categoría que no tenga gastos asociados.
 */
import { conflicto, noEncontrado } from '../../utils/errores.js';
import * as repo from './categorias.repository.js';

const nombreRepetido = (nombre) =>
  conflicto(`Ya existe una categoría llamada "${nombre}" en este grupo.`, { campos: { nombre: 'Ese nombre ya está en uso.' } });

export const listar = (grupoId) => repo.listarCategorias(grupoId);

export async function crear(grupoId, nombre) {
  if (await repo.buscarPorNombre(grupoId, nombre)) throw nombreRepetido(nombre);
  return repo.insertarCategoria(grupoId, nombre);
}

export async function renombrar(grupoId, categoriaId, nombre) {
  const categoria = await repo.buscarCategoria(grupoId, categoriaId);
  if (!categoria) throw noEncontrado('La categoría no existe en este grupo.');
  const otra = await repo.buscarPorNombre(grupoId, nombre);
  if (otra && otra.id !== categoriaId) throw nombreRepetido(nombre);
  await repo.renombrarCategoria(categoriaId, nombre);
  return { ...categoria, nombre };
}

export async function eliminar(grupoId, categoriaId) {
  const categoria = await repo.buscarCategoria(grupoId, categoriaId);
  if (!categoria) throw noEncontrado('La categoría no existe en este grupo.');
  if (categoria.usos > 0) {
    throw conflicto(
      `La categoría "${categoria.nombre}" tiene ${categoria.usos} gasto(s) asociado(s) y no puede eliminarse. Puedes renombrarla.`
    );
  }
  await repo.eliminarCategoria(categoriaId);
}
