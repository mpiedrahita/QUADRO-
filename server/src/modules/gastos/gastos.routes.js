import { Router } from 'express';
import { validar } from '../../middlewares/validar.js';
import { esquemaFiltros, esquemaGasto, paramsGasto } from './gastos.schemas.js';
import * as controlador from './gastos.controller.js';
import { rutasComprobantes } from '../comprobantes/comprobantes.routes.js';

export const rutasGastos = Router({ mergeParams: true });

rutasGastos.get('/', validar(esquemaFiltros, 'query'), controlador.listar);
rutasGastos.post('/', validar(esquemaGasto), controlador.crear);
rutasGastos.get('/:gastoId', validar(paramsGasto, 'params'), controlador.obtener);
rutasGastos.put('/:gastoId', validar(paramsGasto, 'params'), validar(esquemaGasto), controlador.actualizar);
rutasGastos.patch('/:gastoId/anular', validar(paramsGasto, 'params'), controlador.anular);
rutasGastos.use('/:gastoId/comprobantes', validar(paramsGasto, 'params'), rutasComprobantes);
