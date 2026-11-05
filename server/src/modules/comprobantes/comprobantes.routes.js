import { Router } from 'express';
import multer from 'multer';
import { noEncontrado } from '../../utils/errores.js';
import { TAMANO_MAXIMO } from './comprobantes.service.js';
import * as controlador from './comprobantes.controller.js';

// El archivo se recibe en memoria (máx. 2 MB) y se guarda en PostgreSQL.
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANO_MAXIMO, files: 1 } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validarComprobanteId(req, _res, next) {
  if (!UUID.test(req.params.comprobanteId)) return next(noEncontrado('El comprobante no existe.'));
  req.validado.comprobanteId = req.params.comprobanteId;
  next();
}

export const rutasComprobantes = Router({ mergeParams: true });

rutasComprobantes.get('/', controlador.listar);
rutasComprobantes.post('/', subida.single('archivo'), controlador.adjuntar);
rutasComprobantes.get('/:comprobanteId/archivo', validarComprobanteId, controlador.descargar);
rutasComprobantes.delete('/:comprobanteId', validarComprobanteId, controlador.eliminar);
