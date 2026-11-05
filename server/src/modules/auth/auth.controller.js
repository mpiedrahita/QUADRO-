import * as servicio from './auth.service.js';
import { firmarToken, opcionesCookie, NOMBRE_COOKIE } from '../../middlewares/autenticacion.js';

function abrirSesion(res, usuario, estado = 200) {
  res.cookie(NOMBRE_COOKIE, firmarToken(usuario), opcionesCookie());
  res.status(estado).json({ usuario });
}

export async function registrar(req, res) {
  const usuario = await servicio.registrar(req.validado.body);
  abrirSesion(res, usuario, 201);
}

export async function iniciarSesion(req, res) {
  const usuario = await servicio.iniciarSesion(req.validado.body);
  abrirSesion(res, usuario);
}

export function cerrarSesion(_req, res) {
  const { maxAge: _omitido, ...opciones } = opcionesCookie();
  res.clearCookie(NOMBRE_COOKIE, opciones);
  res.status(204).end();
}

export async function perfil(req, res) {
  res.json({ usuario: await servicio.obtenerPerfil(req.usuario.id) });
}
