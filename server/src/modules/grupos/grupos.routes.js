import { Router } from 'express';
import { validar } from '../../middlewares/validar.js';
import { requiereSesion } from '../../middlewares/autenticacion.js';
import { requiereAdministrador, requiereMembresia } from '../../middlewares/membresia.js';
import { esquemaGrupo } from './grupos.schemas.js';
import * as controlador from './grupos.controller.js';
import { rutasParticipantes } from '../participantes/participantes.routes.js';
import { rutasCategorias } from '../categorias/categorias.routes.js';
import { rutasGastos } from '../gastos/gastos.routes.js';
import { rutasSaldos } from '../saldos/saldos.routes.js';
import { rutasLiquidaciones } from '../liquidaciones/liquidaciones.routes.js';

export const rutasGrupos = Router();

// RNF-01: todas las rutas de grupos requieren sesión iniciada.
rutasGrupos.use(requiereSesion);

rutasGrupos.get('/', controlador.listar);
rutasGrupos.post('/', validar(esquemaGrupo), controlador.crear);

// Rutas dentro de un grupo: RNF-04, solo para integrantes activos.
const enGrupo = Router({ mergeParams: true });
rutasGrupos.use('/:grupoId', requiereMembresia, enGrupo);

enGrupo.get('/', controlador.detalle);
enGrupo.patch('/', requiereAdministrador, validar(esquemaGrupo), controlador.actualizar);
enGrupo.use('/participantes', rutasParticipantes);
enGrupo.use('/categorias', rutasCategorias);
enGrupo.use('/gastos', rutasGastos);
enGrupo.use('/saldos', rutasSaldos);
enGrupo.use('/liquidaciones', rutasLiquidaciones);
