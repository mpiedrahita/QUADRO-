/**
 * Errores de aplicación con código HTTP y mensaje comprensible para el usuario (RNF-05).
 */
export class AppError extends Error {
  /**
   * @param {number} estado Código HTTP
   * @param {string} mensaje Mensaje para mostrar al usuario
   * @param {object} [extra] Datos adicionales (por ejemplo, errores por campo)
   */
  constructor(estado, mensaje, extra = {}) {
    super(mensaje);
    this.estado = estado;
    this.extra = extra;
  }
}

export const solicitudInvalida = (mensaje, campos) => new AppError(400, mensaje, campos ? { campos } : {});
export const noAutenticado = (mensaje = 'Debes iniciar sesión para continuar.') => new AppError(401, mensaje);
export const prohibido = (mensaje = 'No tienes permiso para realizar esta acción.') => new AppError(403, mensaje);
export const noEncontrado = (mensaje = 'El recurso solicitado no existe.', extra) => new AppError(404, mensaje, extra);
export const conflicto = (mensaje, extra) => new AppError(409, mensaje, extra);

/** Error de una regla de negocio del dominio (reparto, saldos). Se traduce a 400. */
export class ErrorDominio extends Error {
  constructor(mensaje, campo) {
    super(mensaje);
    this.campo = campo;
  }
}
