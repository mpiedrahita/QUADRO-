import { env } from '../config/env.js';

/** Devuelve la fecha de hoy (AAAA-MM-DD) en la zona horaria configurada (APP_TZ). */
export function hoyISO(zona = env.APP_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Verifica que el texto sea una fecha real con formato AAAA-MM-DD. */
export function esFechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}
