import { Router } from 'express';
import { z } from 'zod';
import { validar } from '../../middlewares/validar.js';
import { requiereAdministrador } from '../../middlewares/membresia.js';
import { correo, uuid } from '../../utils/esquemas.js';
import * as controlador from './participantes.controller.js';

export const rutasParticipantes = Router({ mergeParams: true });

rutasParticipantes.get('/', controlador.listar);
rutasParticipantes.post('/', requiereAdministrador, validar(z.object({ correo })), controlador.agregar);
rutasParticipantes.delete(
  '/:participacionId',
  requiereAdministrador,
  validar(z.object({ grupoId: z.string(), participacionId: uuid('El participante') }), 'params'),
  controlador.retirar
);
