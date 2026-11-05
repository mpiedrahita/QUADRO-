import jwt from 'jsonwebtoken';
import { env, esProduccion } from '../config/env.js';
import { noAutenticado } from '../utils/errores.js';

export const NOMBRE_COOKIE = 'quadro_sesion';

/** Crea el token de sesión firmado para un usuario. */
export function firmarToken(usuario) {
  return jwt.sign({ sub: usuario.id, nombre: usuario.nombre }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/** Opciones de la cookie de sesión: httpOnly evita que JavaScript la lea (mitiga XSS). */
export function opcionesCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: esProduccion,
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

/**
 * RNF-01: las funciones privadas requieren autenticación.
 * Lee el token de la cookie (o del encabezado Authorization: Bearer, útil para Postman).
 */
export function requiereSesion(req, _res, next) {
  const cabecera = req.get('authorization');
  const token = req.cookies?.[NOMBRE_COOKIE] ?? (cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null);
  if (!token) return next(noAutenticado());
  try {
    const datos = jwt.verify(token, env.JWT_SECRET);
    req.usuario = { id: datos.sub, nombre: datos.nombre };
    next();
  } catch {
    next(noAutenticado('Tu sesión expiró o no es válida. Inicia sesión de nuevo.'));
  }
}
