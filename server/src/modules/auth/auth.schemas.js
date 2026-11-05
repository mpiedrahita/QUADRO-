import { z } from 'zod';
import { texto, correo } from '../../utils/esquemas.js';

/** RF-01: datos básicos para registrar un usuario. */
export const esquemaRegistro = z.object({
  nombre: texto('El nombre', 2, 80),
  correo,
  contrasena: z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede superar 72 caracteres.')
    .refine((v) => /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v) && /\d/.test(v), 'La contraseña debe incluir al menos una letra y un número.'),
});

/** RF-02: credenciales de inicio de sesión. */
export const esquemaLogin = z.object({
  correo,
  contrasena: z.string({ error: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.'),
});
