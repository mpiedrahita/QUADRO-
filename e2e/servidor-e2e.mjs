/**
 * Servidor para las pruebas de extremo a extremo (E2E):
 * reinicia la base E2E_DATABASE_URL, aplica migraciones y levanta Quadro
 * (API + frontend compilado en client/dist) en el puerto 4100.
 */
import { existsSync } from 'node:fs';
import pg from 'pg';

const raiz = new URL('../', import.meta.url);
const archivoEnv = new URL('.env', raiz);
if (existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);

const url = process.env.E2E_DATABASE_URL;
if (!url) throw new Error('Define E2E_DATABASE_URL en .env para ejecutar las pruebas E2E.');
if (!/e2e|test/i.test(new URL(url).pathname)) throw new Error('E2E_DATABASE_URL debe apuntar a una base de datos de pruebas.');
if (!existsSync(new URL('client/dist/index.html', raiz))) throw new Error('Compila el frontend primero: npm run build');

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await cliente.end();

process.env.DATABASE_URL = url;
process.env.PORT = process.env.E2E_PORT ?? '4100';
process.env.NODE_ENV = 'development'; // cookies sin "secure" porque las pruebas usan http://localhost
process.env.LOGIN_RATE_LIMIT = '1000';
await import('../server/src/server.js');
