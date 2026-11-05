import * as servicio from './comprobantes.service.js';

const ids = (req) => ({ grupoId: req.params.grupoId, gastoId: req.validado.params.gastoId });

export async function listar(req, res) {
  const { grupoId, gastoId } = ids(req);
  res.json({ comprobantes: await servicio.listar(grupoId, gastoId) });
}

export async function adjuntar(req, res) {
  const { grupoId, gastoId } = ids(req);
  res.status(201).json({ comprobante: await servicio.adjuntar(grupoId, gastoId, req.membresia, req.file) });
}

export async function descargar(req, res) {
  const { grupoId, gastoId } = ids(req);
  const archivo = await servicio.obtenerArchivo(grupoId, gastoId, req.validado.comprobanteId);
  res.set({
    'Content-Type': archivo.tipoMime,
    'Content-Length': archivo.tamanoBytes,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombreArchivo)}`,
    'Cache-Control': 'private, max-age=0, no-store',
  });
  res.send(archivo.contenido);
}

export async function eliminar(req, res) {
  const { grupoId, gastoId } = ids(req);
  await servicio.eliminar(grupoId, gastoId, req.validado.comprobanteId, req.membresia);
  res.status(204).end();
}
