/**
 * PI-01 · HU-01 · RF-01, RF-02, RNF-01: registro, inicio y cierre de sesión.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, correoUnico } from '../helpers/api.js';

describe('PI-01 · Acceso al sistema (HU-01)', () => {
  it('PI-01a · registro con datos válidos crea la cuenta y abre sesión', async () => {
    const agente = request.agent(app);
    const correo = correoUnico('Ana');
    const res = await agente.post('/api/auth/registro').send({ nombre: 'Ana Torres', correo, contrasena: 'clave1234' });
    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({ nombre: 'Ana Torres', correo });
    expect(res.body.usuario).not.toHaveProperty('contrasenaHash');
    expect(res.headers['set-cookie'][0]).toMatch(/quadro_sesion=.+; .*HttpOnly/);

    const perfil = await agente.get('/api/auth/me');
    expect(perfil.status).toBe(200);
    expect(perfil.body.usuario.correo).toBe(correo);
  });

  it('PI-01b · registro con campos inválidos responde 400 con el error de cada campo', async () => {
    const res = await request(app).post('/api/auth/registro').send({ nombre: '', correo: 'x', contrasena: '1' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.campos).sort()).toEqual(['contrasena', 'correo', 'nombre']);
  });

  it('PI-01c · no se permite registrar dos cuentas con el mismo correo (sin importar mayúsculas)', async () => {
    const correo = correoUnico('Bruno');
    await request(app).post('/api/auth/registro').send({ nombre: 'Bruno', correo, contrasena: 'clave1234' });
    const res = await request(app).post('/api/auth/registro').send({ nombre: 'Otro', correo: correo.toUpperCase(), contrasena: 'clave1234' });
    expect(res.status).toBe(409);
    expect(res.body.error.mensaje).toBe('Ya existe una cuenta registrada con ese correo.');
  });

  it('PI-01d · inicio de sesión con credenciales válidas concede acceso', async () => {
    const correo = correoUnico('Carla');
    await request(app).post('/api/auth/registro').send({ nombre: 'Carla', correo, contrasena: 'clave1234' });
    const agente = request.agent(app);
    const res = await agente.post('/api/auth/login').send({ correo, contrasena: 'clave1234' });
    expect(res.status).toBe(200);
    expect((await agente.get('/api/grupos')).status).toBe(200);
  });

  it('PI-01e · credenciales incorrectas muestran un error genérico y no conceden acceso', async () => {
    const correo = correoUnico('Dario');
    await request(app).post('/api/auth/registro').send({ nombre: 'Dario', correo, contrasena: 'clave1234' });
    const malaClave = await request(app).post('/api/auth/login').send({ correo, contrasena: 'otra9999' });
    const sinCuenta = await request(app).post('/api/auth/login').send({ correo: correoUnico('nadie'), contrasena: 'clave1234' });
    for (const res of [malaClave, sinCuenta]) {
      expect(res.status).toBe(401);
      expect(res.body.error.mensaje).toBe('Correo o contraseña incorrectos.');
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('PI-01f · RNF-01: sin sesión se niega el acceso a las funciones privadas', async () => {
    for (const ruta of ['/api/auth/me', '/api/grupos', '/api/grupos/7a4c2b1e-1d1f-4b44-9c0e-2f1a1b1c1d1e/saldos']) {
      const res = await request(app).get(ruta);
      expect(res.status, ruta).toBe(401);
    }
    const tokenFalso = await request(app).get('/api/grupos').set('Cookie', 'quadro_sesion=token.falso.123');
    expect(tokenFalso.status).toBe(401);
    expect(tokenFalso.body.error.mensaje).toMatch(/sesión expiró o no es válida/);
  });

  it('PI-01g · cerrar sesión elimina la cookie y vuelve a exigir autenticación', async () => {
    const agente = request.agent(app);
    await agente.post('/api/auth/registro').send({ nombre: 'Elena', correo: correoUnico('Elena'), contrasena: 'clave1234' });
    expect((await agente.get('/api/auth/me')).status).toBe(200);
    const salida = await agente.post('/api/auth/logout');
    expect(salida.status).toBe(204);
    expect((await agente.get('/api/auth/me')).status).toBe(401);
  });
});
