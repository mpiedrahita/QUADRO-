import * as servicio from './grupos.service.js';

export async function crear(req, res) {
  res.status(201).json({ grupo: await servicio.crearGrupo(req.usuario.id, req.validado.body) });
}

export async function listar(req, res) {
  res.json({ grupos: await servicio.listarMisGrupos(req.usuario.id) });
}

export async function detalle(req, res) {
  res.json({ grupo: await servicio.obtenerDetalle(req.params.grupoId, req.membresia) });
}

export async function actualizar(req, res) {
  res.json({ grupo: await servicio.actualizarGrupo(req.params.grupoId, req.validado.body, req.membresia) });
}
