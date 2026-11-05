/**
 * Prepara la base de datos de pruebas una sola vez antes de toda la suite:
 * borra el esquema público y vuelve a aplicar las migraciones.
 * Por seguridad, se niega a ejecutarse si la URL no apunta a una base con "test" en el nombre.
 */
import pg from 'pg';

export default async function prepararBaseDePruebas() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Define TEST_DATABASE_URL en el archivo .env para ejecutar las pruebas.');
  const nombreBase = new URL(url).pathname.slice(1);
  if (!/test/i.test(nombreBase)) {
    throw new Error(`TEST_DATABASE_URL debe apuntar a una base de datos de pruebas (actual: "${nombreBase}").`);
  }
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await cliente.end();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = url;
  const { migrar } = await import('../../src/db/migrate.js');
  const { pool } = await import('../../src/db/pool.js');
  await migrar({ silencioso: true });
  await pool.end();
}
