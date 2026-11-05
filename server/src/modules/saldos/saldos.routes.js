import { Router } from 'express';
import { obtenerResumen } from './saldos.service.js';

export const rutasSaldos = Router({ mergeParams: true });

/** RF-08 · RF-17 · HU-06 · DS-03: saldos, deudas pendientes y resumen financiero del grupo. */
rutasSaldos.get('/', async (req, res) => {
  res.json(await obtenerResumen(req.params.grupoId, req.membresia.participacionId));
});
