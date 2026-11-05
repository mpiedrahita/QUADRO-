import { z } from 'zod';
import { texto, textoOpcional } from '../../utils/esquemas.js';

/** RF-03 · HU-02: datos obligatorios para crear un grupo o emprendimiento. */
export const esquemaGrupo = z.object({
  nombre: texto('El nombre del grupo', 3, 80),
  descripcion: textoOpcional('La descripción', 255),
});
