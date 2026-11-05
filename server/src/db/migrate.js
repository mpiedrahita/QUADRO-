/**
 * Ejecutor de migraciones SQL.
 * Aplica en orden los archivos de ./migrations que aún no se han ejecutado
 * y registra cada uno en la tabla schema_migraciones.
 *
 * Uso: npm run db:migrate
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const carpeta = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrar({ silencioso = false } = {}) {
  const cliente = await pool.connect();
  try {
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS schema_migraciones (
        nombre      VARCHAR(200) PRIMARY KEY,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const { rows } = await cliente.query('SELECT nombre FROM schema_migraciones');
    const aplicadas = new Set(rows.map((r) => r.nombre));
    const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.sql')).sort();

    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) continue;
      const sql = await readFile(path.join(carpeta, archivo), 'utf8');
      await cliente.query('BEGIN');
      try {
        await cliente.query(sql);
        await cliente.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
        await cliente.query('COMMIT');
        if (!silencioso) console.log(`[migración] aplicada: ${archivo}`);
      } catch (error) {
        await cliente.query('ROLLBACK');
        throw new Error(`Falló la migración ${archivo}: ${error.message}`, { cause: error });
      }
    }
    if (!silencioso) console.log('[migración] base de datos al día');
  } finally {
    cliente.release();
  }
}

// Ejecución directa desde la línea de comandos.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrar()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
