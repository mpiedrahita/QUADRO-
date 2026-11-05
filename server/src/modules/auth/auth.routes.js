import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env, esPrueba } from '../../config/env.js';
import { validar } from '../../middlewares/validar.js';
import { requiereSesion } from '../../middlewares/autenticacion.js';
import { esquemaLogin, esquemaRegistro } from './auth.schemas.js';
import * as controlador from './auth.controller.js';

const limiteIntentos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => esPrueba && !process.env.PROBAR_LIMITE,
  message: { error: { mensaje: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' } },
});

export const rutasAuth = Router();

rutasAuth.post('/registro', limiteIntentos, validar(esquemaRegistro), controlador.registrar);
rutasAuth.post('/login', limiteIntentos, validar(esquemaLogin), controlador.iniciarSesion);
rutasAuth.post('/logout', controlador.cerrarSesion);
rutasAuth.get('/me', requiereSesion, controlador.perfil);
