import * as servicio from './gastos.service.js';

export async function listar(req, res) {
  res.json({ gastos: await servicio.listar(req.params.grupoId, req.validado.query) });
}

export async function obtener(req, res) {
  const { grupoId, gastoId } = req.validado.params;
  res.json({ gasto: await servicio.obtener(grupoId, gastoId) });
}

export async function crear(req, res) {
  res.status(201).json({ gasto: await servicio.crear(req.params.grupoId, req.membresia, req.validado.body) });
}

export async function actualizar(req, res) {
  const { grupoId, gastoId } = req.validado.params;
  res.json({ gasto: await servicio.actualizar(grupoId, gastoId, req.membresia, req.validado.body) });
}

export async function anular(req, res) {
  const { grupoId, gastoId } = req.validado.params;
  res.json({ gasto: await servicio.anular(grupoId, gastoId, req.membresia) });
}
