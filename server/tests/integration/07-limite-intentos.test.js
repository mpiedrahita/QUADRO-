/**
 * PI-12 · Seguridad básica: límite de intentos de inicio de sesión por IP.
 * Este archivo activa el limitador con un límite bajo antes de cargar la aplicación.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';

process.env.PROBAR_LIMITE = '1';
process.env.LOGIN_RATE_LIMIT = '3';
const { crearApp } = await import('../../src/app.js');

describe('PI-12 · Límite de intentos de inicio de sesión', () => {
  it('PI-12 · tras 3 intentos fallidos se bloquean nuevos intentos temporalmente', async () => {
    const app = crearApp();
    const intento = () => request(app).post('/api/auth/login').send({ correo: 'ataque@prueba.co', contrasena: 'x1234567' });
    for (let i = 0; i < 3; i++) expect((await intento()).status).toBe(401);
    const bloqueado = await intento();
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.mensaje).toBe('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
  });
});
