/**
 * Construcción de la aplicación Express (capa de API).
 * Se exporta como función para poder crear instancias en las pruebas de integración.
 */
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env, esProduccion } from './config/env.js';
import { query } from './db/pool.js';
import { rutasAuth } from './modules/auth/auth.routes.js';
import { rutasGrupos } from './modules/grupos/grupos.routes.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/manejoErrores.js';

const carpetaCliente = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // detrás del proxy de Render/Railway para que el límite por IP funcione

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          objectSrc: ["'none'"],
          frameSrc: ["'self'", 'blob:'],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: esProduccion ? [] : null,
        },
      },
    })
  );

  // En desarrollo el frontend corre en otro puerto (Vite); se permite solo ese origen.
  if (!esProduccion) {
    app.use((req, res, next) => {
      const origen = req.get('origin');
      if (origen && origen === env.CLIENT_ORIGIN) {
        res.set({
          'Access-Control-Allow-Origin': origen,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE',
          Vary: 'Origin',
        });
        if (req.method === 'OPTIONS') return res.status(204).end();
      }
      next();
    });
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/salud', async (_req, res) => {
    await query('SELECT 1');
    res.json({ estado: 'ok', servicio: 'quadro-api', baseDeDatos: 'conectada' });
  });

  app.use('/api/auth', rutasAuth);
  app.use('/api/grupos', rutasGrupos);
  app.use('/api', rutaNoEncontrada);

  // En producción la misma aplicación sirve el frontend compilado (client/dist).
  if (existsSync(carpetaCliente)) {
    app.use(express.static(carpetaCliente, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(carpetaCliente, 'index.html')));
  }

  app.use(manejarErrores);
  return app;
}
