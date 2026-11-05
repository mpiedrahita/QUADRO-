import * as servicio from './categorias.service.js';

export async function listar(req, res) {
  res.json({ categorias: await servicio.listar(req.params.grupoId) });
}

export async function crear(req, res) {
  res.status(201).json({ categoria: await servicio.crear(req.params.grupoId, req.validado.body.nombre) });
}

export async function renombrar(req, res) {
  const { grupoId, categoriaId } = req.validado.params;
  res.json({ categoria: await servicio.renombrar(grupoId, categoriaId, req.validado.body.nombre) });
}

export async function eliminar(req, res) {
  const { grupoId, categoriaId } = req.validado.params;
  await servicio.eliminar(grupoId, categoriaId);
  res.status(204).end();
}
