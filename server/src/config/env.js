/**
 * Carga y valida las variables de entorno al iniciar.
 * Si falta una variable obligatoria, la aplicación se detiene con un mensaje claro
 * en lugar de fallar más adelante de forma confusa.
 */
import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  TEST_DATABASE_URL: z.string().optional(),
  DATABASE_SSL: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  APP_TZ: z.string().default('America/Bogota'),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
});

function cargarEntorno() {
  const datos = { ...process.env };
  // En pruebas se usa la base de datos de pruebas para no tocar datos reales.
  if (datos.NODE_ENV === 'test' && datos.TEST_DATABASE_URL) {
    datos.DATABASE_URL = datos.TEST_DATABASE_URL;
  }
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalles = resultado.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`\n[Quadro] Configuración inválida. Revisa tu archivo .env:\n${detalles}\n`);
    process.exit(1);
  }
  return resultado.data;
}

export const env = cargarEntorno();
export const esProduccion = env.NODE_ENV === 'production';
export const esPrueba = env.NODE_ENV === 'test';
