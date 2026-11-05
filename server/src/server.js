/**
 * Punto de entrada: aplica migraciones pendientes y levanta el servidor HTTP.
 */
import { crearApp } from './app.js';
import { env } from './config/env.js';
import { migrar } from './db/migrate.js';
import { pool } from './db/pool.js';

async function iniciar() {
  await migrar({ silencioso: true });
  const servidor = crearApp().listen(env.PORT, () => {
    console.log(`[Quadro] API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const cerrar = () => {
    servidor.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', cerrar);
  process.on('SIGINT', cerrar);
}

iniciar().catch((error) => {
  console.error('[Quadro] No fue posible iniciar el servidor:', error.message);
  process.exit(1);
});
