import multer from 'multer';
import { AppError, ErrorDominio } from '../utils/errores.js';
import { esProduccion, esPrueba } from '../config/env.js';

/** Respuesta 404 para rutas de la API que no existen. */
export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: { mensaje: `La ruta ${req.method} ${req.originalUrl} no existe.` } });
}

/**
 * Manejador central de errores. Convierte cualquier error en una respuesta JSON
 * con formato { error: { mensaje, campos? } } y nunca expone detalles internos en producción.
 */
export function manejarErrores(error, _req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.estado).json({ error: { mensaje: error.message, ...error.extra } });
  }
  if (error instanceof ErrorDominio) {
    const cuerpo = { mensaje: error.message };
    if (error.campo) cuerpo.campos = { [error.campo]: error.message };
    return res.status(400).json({ error: cuerpo });
  }
  if (error instanceof multer.MulterError) {
    const mensaje =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo permitido (2 MB).'
        : 'No fue posible procesar el archivo enviado.';
    return res.status(400).json({ error: { mensaje } });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { mensaje: 'El cuerpo de la solicitud no es un JSON válido.' } });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: { mensaje: 'La solicitud es demasiado grande.' } });
  }
  // Violaciones de restricciones de la base de datos que no se validaron antes.
  if (error?.code === '23505') {
    return res.status(409).json({ error: { mensaje: 'Ya existe un registro con esos datos.' } });
  }
  if (error?.code === '22P02') {
    return res.status(400).json({ error: { mensaje: 'Uno de los identificadores no tiene un formato válido.' } });
  }

  if (!esPrueba) console.error('[error no controlado]', error);
  return res.status(500).json({
    error: {
      mensaje: 'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.',
      ...(esProduccion ? {} : { detalle: error?.message }),
    },
  });
}
