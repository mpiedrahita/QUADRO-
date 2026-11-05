import { solicitudInvalida } from '../utils/errores.js';

/**
 * Valida req.body, req.query o req.params con un esquema Zod.
 * Si hay errores responde 400 con el detalle por campo (RNF-05).
 * @param {import('zod').ZodTypeAny} esquema
 * @param {'body'|'query'|'params'} origen
 */
export function validar(esquema, origen = 'body') {
  return (req, _res, next) => {
    const resultado = esquema.safeParse(req[origen] ?? {});
    if (!resultado.success) {
      const campos = {};
      for (const issue of resultado.error.issues) {
        const clave = issue.path.join('.') || 'general';
        if (!campos[clave]) campos[clave] = issue.message;
      }
      return next(solicitudInvalida('Revisa los datos ingresados.', campos));
    }
    // En Express 5 req.query es de solo lectura: se guarda el resultado aparte.
    req.validado = { ...(req.validado ?? {}), [origen]: resultado.data };
    next();
  };
}
