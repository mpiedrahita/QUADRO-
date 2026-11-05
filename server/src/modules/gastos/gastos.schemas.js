import { z } from 'zod';
import { fecha, importe, texto, uuid } from '../../utils/esquemas.js';
import { esFechaValida } from '../../utils/fechas.js';

const numeroOpcional = (etiqueta) => z.number({ error: `${etiqueta} debe ser un número.` }).nullable().optional();

/** RF-05 · RF-06 · HU-04 · HU-05: datos de un gasto y su distribución. */
export const esquemaGasto = z.object({
  descripcion: texto('La descripción', 3, 120),
  importe,
  fecha: fecha('La fecha'),
  categoriaId: uuid('La categoría'),
  pagadorId: uuid('Quien pagó'),
  metodo: z.enum(['IGUAL', 'PORCENTAJE', 'VALOR'], { error: 'Selecciona un método de distribución válido.' }),
  repartos: z
    .array(
      z.object({
        participacionId: uuid('El participante'),
        porcentaje: numeroOpcional('El porcentaje'),
        valor: numeroOpcional('El valor'),
      }),
      { error: 'Selecciona los participantes del reparto.' }
    )
    .min(1, 'Selecciona al menos un participante para el reparto.')
    .max(100, 'El reparto admite como máximo 100 participantes.'),
});

const fechaFiltro = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || esFechaValida(v), 'La fecha del filtro no es válida (AAAA-MM-DD).');

/** RF-12 · HU-07: filtros del historial. */
export const esquemaFiltros = z
  .object({
    desde: fechaFiltro,
    hasta: fechaFiltro,
    categoriaId: z.string().uuid('La categoría del filtro no es válida.').optional().or(z.literal('').transform(() => undefined)),
    participanteId: z.string().uuid('El participante del filtro no es válido.').optional().or(z.literal('').transform(() => undefined)),
    incluirAnulados: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  })
  .refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, {
    message: 'La fecha inicial no puede ser posterior a la fecha final.',
    path: ['desde'],
  });

export const paramsGasto = z.object({ grupoId: z.string(), gastoId: uuid('El gasto') });
