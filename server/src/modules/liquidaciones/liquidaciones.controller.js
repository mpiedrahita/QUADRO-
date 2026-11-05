import * as servicio from './liquidaciones.service.js';

export async function listar(req, res) {
  res.json({ liquidaciones: await servicio.listar(req.params.grupoId) });
}

export async function crear(req, res) {
  res.status(201).json({ liquidacion: await servicio.crear(req.params.grupoId, req.membresia, req.validado.body) });
}

export async function anular(req, res) {
  const { grupoId, liquidacionId } = req.validado.params;
  res.json({ liquidacion: await servicio.anular(grupoId, liquidacionId, req.membresia) });
}
