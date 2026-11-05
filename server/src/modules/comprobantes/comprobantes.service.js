/**
 * RF-09 · HU-08 · RNF-09: comprobantes adjuntos a los gastos.
 *
 * Reglas:
 *  - Formatos permitidos: JPG, PNG, WEBP y PDF. El tipo se comprueba leyendo la firma
 *    del archivo (primeros bytes), no solo la extensión que envía el navegador.
 *  - Tamaño máximo: 2 MB por archivo. Máximo 5 comprobantes por gasto.
 *  - No se adjuntan comprobantes a gastos anulados.
 */
import { conflicto, noEncontrado, prohibido, solicitudInvalida } from '../../utils/errores.js';
import { esAdministrador } from '../../middlewares/membresia.js';
import { buscarGasto } from '../gastos/gastos.repository.js';
import * as repo from './comprobantes.repository.js';

export const TAMANO_MAXIMO = 2 * 1024 * 1024;
export const MAXIMO_POR_GASTO = 5;

/** Detecta el tipo real del archivo por su firma binaria ("magic numbers"). */
export function detectarTipo(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  return null;
}

/** Deja solo caracteres seguros en el nombre del archivo. */
export function limpiarNombre(nombre = 'comprobante') {
  const base = nombre.split(/[\\/]/).pop().normalize('NFC');
  const limpio = base.replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/\s+/g, ' ').trim();
  return (limpio || 'comprobante').slice(0, 150);
}

async function gastoExistente(grupoId, gastoId) {
  const gasto = await buscarGasto(grupoId, gastoId);
  if (!gasto) throw noEncontrado('El gasto no existe en este grupo.');
  return gasto;
}

export async function listar(grupoId, gastoId) {
  await gastoExistente(grupoId, gastoId);
  return repo.listarComprobantes(gastoId);
}

export async function adjuntar(grupoId, gastoId, membresia, archivo) {
  const gasto = await gastoExistente(grupoId, gastoId);
  if (gasto.estado === 'ANULADO') throw conflicto('No se pueden adjuntar comprobantes a un gasto anulado.');
  if (!archivo) throw solicitudInvalida('Selecciona un archivo para adjuntar.', { archivo: 'El archivo es obligatorio.' });

  const tipoMime = detectarTipo(archivo.buffer);
  if (!tipoMime) {
    throw solicitudInvalida('Formato no permitido. Adjunta una imagen JPG, PNG o WEBP, o un PDF.', {
      archivo: 'Formato no permitido.',
    });
  }
  if ((await repo.contarComprobantes(gastoId)) >= MAXIMO_POR_GASTO) {
    throw conflicto(`Un gasto admite como máximo ${MAXIMO_POR_GASTO} comprobantes.`);
  }
  const id = await repo.insertarComprobante({
    gastoId,
    nombreArchivo: limpiarNombre(archivo.originalname),
    tipoMime,
    contenido: archivo.buffer,
    subidoPor: membresia.participacionId,
  });
  return repo.buscarComprobante(gastoId, id);
}

export async function obtenerArchivo(grupoId, gastoId, comprobanteId) {
  await gastoExistente(grupoId, gastoId);
  const comprobante = await repo.buscarComprobante(gastoId, comprobanteId, { conContenido: true });
  if (!comprobante) throw noEncontrado('El comprobante no existe.');
  return comprobante;
}

export async function eliminar(grupoId, gastoId, comprobanteId, membresia) {
  const gasto = await gastoExistente(grupoId, gastoId);
  const comprobante = await repo.buscarComprobante(gastoId, comprobanteId);
  if (!comprobante) throw noEncontrado('El comprobante no existe.');
  const autorizado =
    comprobante.subidoPorId === membresia.participacionId ||
    gasto.registradoPorId === membresia.participacionId ||
    esAdministrador(membresia);
  if (!autorizado) throw prohibido('Solo quien subió el comprobante, quien registró el gasto o el administrador pueden eliminarlo.');
  await repo.eliminarComprobante(comprobanteId);
}
