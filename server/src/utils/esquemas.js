/**
 * Piezas reutilizables para los esquemas de validación (Zod).
 * Todos los mensajes están en español y orientados al usuario (RNF-05).
 */
import { z } from 'zod';
import { esFechaValida } from './fechas.js';

const esFemenino = (etiqueta) => /^la /i.test(etiqueta);
/** "El nombre es obligatorio." / "La categoría es obligatoria." */
export const obligatorio = (etiqueta) => `${etiqueta} es ${esFemenino(etiqueta) ? 'obligatoria' : 'obligatorio'}.`;
const noValido = (etiqueta) => `${etiqueta} no es ${esFemenino(etiqueta) ? 'válida' : 'válido'}.`;

/** Texto obligatorio con recorte de espacios y longitudes mínima y máxima. */
export const texto = (etiqueta, min, max) =>
  z
    .string({ error: (i) => (i.input === undefined || i.input === null ? obligatorio(etiqueta) : `${etiqueta} debe ser texto.`) })
    .trim()
    .min(min, min === 1 ? obligatorio(etiqueta) : `${etiqueta} debe tener al menos ${min} caracteres.`)
    .max(max, `${etiqueta} no puede superar ${max} caracteres.`);

/** Texto opcional: cadena vacía se convierte en null. */
export const textoOpcional = (etiqueta, max) =>
  z
    .string({ error: `${etiqueta} debe ser texto.` })
    .trim()
    .max(max, `${etiqueta} no puede superar ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const correo = z
  .string({ error: (i) => (i.input === undefined ? 'El correo es obligatorio.' : 'El correo debe ser texto.') })
  .trim()
  .toLowerCase()
  .min(1, 'El correo es obligatorio.')
  .max(120, 'El correo no puede superar 120 caracteres.')
  .pipe(z.email('Ingresa un correo electrónico válido.'));

export const uuid = (etiqueta = 'El identificador') =>
  z.string({ error: obligatorio(etiqueta) }).uuid(noValido(etiqueta));

/** Importe en pesos enteros. Acepta número o texto numérico. */
export const importe = z.coerce
  .number({ error: 'El importe debe ser un número.' })
  .refine((v) => Number.isFinite(v), 'El importe debe ser un número.')
  .refine((v) => Number.isInteger(v), 'El importe debe ser un valor entero en pesos (sin centavos).')
  .refine((v) => v > 0, 'El importe debe ser mayor que cero.')
  .refine((v) => v <= 1_000_000_000, 'El importe no puede superar $1.000.000.000.');

export const fecha = (etiqueta = 'La fecha') =>
  z
    .string({ error: obligatorio(etiqueta) })
    .min(1, obligatorio(etiqueta))
    .refine(esFechaValida, `${etiqueta} debe tener el formato AAAA-MM-DD y ser una fecha real.`);

export const paramsGrupo = z.object({ grupoId: uuid('El grupo') });
