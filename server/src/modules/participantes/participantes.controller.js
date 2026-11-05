import * as servicio from './participantes.service.js';

export async function listar(req, res) {
  const incluirRetirados = req.query.incluirRetirados === 'true';
  res.json({ participantes: await servicio.listar(req.params.grupoId, { incluirRetirados }) });
}

export async function agregar(req, res) {
  res.status(201).json({ participante: await servicio.agregar(req.params.grupoId, req.validado.body.correo) });
}

export async function retirar(req, res) {
  res.json({ participante: await servicio.retirar(req.params.grupoId, req.validado.params.participacionId) });
}
