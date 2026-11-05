import { Router } from 'express';
import { z } from 'zod';
import { validar } from '../../middlewares/validar.js';
import { fecha, importe, textoOpcional, uuid } from '../../utils/esquemas.js';
import * as controlador from './liquidaciones.controller.js';

const esquemaLiquidacion = z
  .object({
    emisorId: uuid('Quien paga'),
    receptorId: uuid('Quien recibe'),
    importe,
    fecha: fecha('La fecha'),
    nota: textoOpcional('La nota', 120),
  })
  .refine((d) => d.emisorId !== d.receptorId, {
    message: 'Quien paga y quien recibe deben ser personas distintas.',
    path: ['receptorId'],
  });

const paramsLiquidacion = z.object({ grupoId: z.string(), liquidacionId: uuid('La liquidación') });

export const rutasLiquidaciones = Router({ mergeParams: true });

rutasLiquidaciones.get('/', controlador.listar);
rutasLiquidaciones.post('/', validar(esquemaLiquidacion), controlador.crear);
rutasLiquidaciones.patch('/:liquidacionId/anular', validar(paramsLiquidacion, 'params'), controlador.anular);
