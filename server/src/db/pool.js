/**
 * Conexión a PostgreSQL mediante un pool de conexiones.
 * Expone utilidades para consultas simples y para transacciones.
 */
import pg from 'pg';
import { env } from '../config/env.js';

// Las sumas (SUM) de PostgreSQL llegan como texto (bigint); se convierten a número.
pg.types.setTypeParser(20, (valor) => Number(valor));
// Los campos DATE se devuelven como texto 'AAAA-MM-DD' para evitar desfases de zona horaria.
pg.types.setTypeParser(1082, (valor) => valor);
// NUMERIC (porcentajes) como número.
pg.types.setTypeParser(1700, (valor) => (valor === null ? null : Number(valor)));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  max: 10,
});

/** Ejecuta una consulta parametrizada (evita inyección SQL). */
export function query(texto, parametros = []) {
  return pool.query(texto, parametros);
}

/**
 * Ejecuta una función dentro de una transacción.
 * Si la función lanza un error se hace ROLLBACK y no queda ningún dato parcial.
 * @param {(cliente: pg.PoolClient) => Promise<any>} trabajo
 */
export async function enTransaccion(trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
