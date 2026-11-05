import { Router } from 'express';
import { z } from 'zod';
import { validar } from '../../middlewares/validar.js';
import { requiereAdministrador } from '../../middlewares/membresia.js';
import { texto, uuid } from '../../utils/esquemas.js';
import * as controlador from './categorias.controller.js';

const esquemaCategoria = z.object({ nombre: texto('El nombre de la categoría', 2, 40) });
const paramsCategoria = z.object({ grupoId: z.string(), categoriaId: uuid('La categoría') });

export const rutasCategorias = Router({ mergeParams: true });

rutasCategorias.get('/', controlador.listar);
rutasCategorias.post('/', requiereAdministrador, validar(esquemaCategoria), controlador.crear);
rutasCategorias.patch(
  '/:categoriaId',
  requiereAdministrador,
  validar(paramsCategoria, 'params'),
  validar(esquemaCategoria),
  controlador.renombrar
);
rutasCategorias.delete('/:categoriaId', requiereAdministrador, validar(paramsCategoria, 'params'), controlador.eliminar);
