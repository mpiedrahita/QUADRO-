/**
 * PI-02 · HU-02 · RF-03 · DS-01: creación de grupos.
 * PI-03 · HU-03 · RF-04: gestión de participantes y permisos del administrador.
 */
import { describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool.js';
import { escenarioBase, nuevoUsuario, registrarGasto } from '../helpers/api.js';

describe('PI-02 · Crear grupo (HU-02)', () => {
  it('PI-02a · se guardan el grupo y la participación del creador como administrador', async () => {
    const { agente, usuario } = await nuevoUsuario('Ana');
    const res = await agente.post('/api/grupos').send({ nombre: 'Panadería Doña Rosa', descripcion: 'Socias de la panadería' });
    expect(res.status).toBe(201);
    expect(res.body.grupo).toMatchObject({ nombre: 'Panadería Doña Rosa', miRol: 'ADMINISTRADOR', estado: 'ACTIVO' });

    const { rows } = await pool.query('SELECT usuario_id, rol, estado FROM participacion WHERE grupo_id = $1', [res.body.grupo.id]);
    expect(rows).toEqual([{ usuario_id: usuario.id, rol: 'ADMINISTRADOR', estado: 'ACTIVA' }]);

    const categorias = await agente.get(`/api/grupos/${res.body.grupo.id}/categorias`);
    expect(categorias.body.categorias.map((c) => c.nombre)).toEqual(
      expect.arrayContaining(['Materia prima', 'Insumos', 'Transporte', 'Herramientas', 'Servicios', 'Otros'])
    );
  });

  it('PI-02b · faltan datos obligatorios: se indica el campo y no se crea el grupo', async () => {
    const { agente } = await nuevoUsuario('Ana');
    const antes = (await agente.get('/api/grupos')).body.grupos.length;
    const res = await agente.post('/api/grupos').send({ nombre: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.campos.nombre).toBe('El nombre del grupo debe tener al menos 3 caracteres.');
    expect((await agente.get('/api/grupos')).body.grupos.length).toBe(antes);
  });

  it('PI-02c · el listado muestra solo los grupos propios con su resumen', async () => {
    const { ana, bruno, base } = await escenarioBase('Grupo listado');
    await registrarGasto(bruno.agente, base, {
      importe: 30000,
      categoriaId: (await ana.agente.get(`${base}/categorias`)).body.categorias[0].id,
      pagadorId: bruno.participacionId,
      metodo: 'IGUAL',
      repartos: [{ participacionId: bruno.participacionId }, { participacionId: ana.participacionId }],
    });
    const otro = await nuevoUsuario('Externo');
    expect((await otro.agente.get('/api/grupos')).body.grupos).toEqual([]);

    const { grupos } = (await bruno.agente.get('/api/grupos')).body;
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({ nombre: 'Grupo listado', integrantes: 3, numeroGastos: 1, totalGastado: 30000, miSaldo: 15000, miRol: 'INTEGRANTE' });
  });

  it('PI-02d · solo el administrador puede editar los datos del grupo', async () => {
    const { ana, bruno, base } = await escenarioBase();
    expect((await bruno.agente.patch(base).send({ nombre: 'Nuevo nombre' })).status).toBe(403);
    const res = await ana.agente.patch(base).send({ nombre: 'Arepas y Más', descripcion: 'Actualizado' });
    expect(res.status).toBe(200);
    expect(res.body.grupo.nombre).toBe('Arepas y Más');
  });
});

describe('PI-03 · Gestionar participantes (HU-03)', () => {
  it('PI-03a · el administrador agrega un participante válido y queda asociado al grupo', async () => {
    const { ana, base } = await escenarioBase();
    const diana = await nuevoUsuario('Diana');
    const res = await ana.agente.post(`${base}/participantes`).send({ correo: diana.correo.toUpperCase() });
    expect(res.status).toBe(201);
    expect(res.body.participante).toMatchObject({ nombre: 'Diana', rol: 'INTEGRANTE', estado: 'ACTIVA' });
    expect((await diana.agente.get(base)).status).toBe(200);
  });

  it('PI-03b · un integrante sin permisos no puede modificar participantes', async () => {
    const { bruno, carla, base } = await escenarioBase();
    const diana = await nuevoUsuario('Diana');
    const agregar = await bruno.agente.post(`${base}/participantes`).send({ correo: diana.correo });
    expect(agregar.status).toBe(403);
    expect(agregar.body.error.mensaje).toBe('Solo el administrador del grupo puede realizar esta acción.');
    expect((await bruno.agente.delete(`${base}/participantes/${carla.participacionId}`)).status).toBe(403);
  });

  it('PI-03c · correo no registrado o participante repetido se rechazan con un mensaje claro', async () => {
    const { ana, bruno, base } = await escenarioBase();
    const inexistente = await ana.agente.post(`${base}/participantes`).send({ correo: 'nadie@ninguna.parte' });
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error.campos.correo).toBe('Este correo no está registrado en Quadro.');
    const repetido = await ana.agente.post(`${base}/participantes`).send({ correo: bruno.correo });
    expect(repetido.status).toBe(409);
  });

  it('PI-03d · no se retira a quien tiene cuentas pendientes; sin deudas sí, y pierde el acceso', async () => {
    const { ana, bruno, carla, base, categoria } = await escenarioBase();
    await registrarGasto(ana.agente, base, {
      importe: 20000,
      categoriaId: categoria('Insumos'),
      pagadorId: ana.participacionId,
      metodo: 'IGUAL',
      repartos: [{ participacionId: ana.participacionId }, { participacionId: bruno.participacionId }],
    });
    const conDeuda = await ana.agente.delete(`${base}/participantes/${bruno.participacionId}`);
    expect(conDeuda.status).toBe(409);
    expect(conDeuda.body.error.mensaje).toMatch(/Bruno tiene cuentas pendientes/);

    const sinDeuda = await ana.agente.delete(`${base}/participantes/${carla.participacionId}`);
    expect(sinDeuda.status).toBe(200);
    expect(sinDeuda.body.participante.estado).toBe('RETIRADA');
    expect((await carla.agente.get(base)).status).toBe(404);
    const activos = (await ana.agente.get(`${base}/participantes`)).body.participantes.map((p) => p.nombre);
    expect(activos).toEqual(['Ana', 'Bruno']);
  });

  it('PI-03e · el administrador no puede ser retirado y un retirado puede volver a agregarse', async () => {
    const { ana, carla, base } = await escenarioBase();
    const admin = await ana.agente.delete(`${base}/participantes/${ana.participacionId}`);
    expect(admin.status).toBe(400);
    await ana.agente.delete(`${base}/participantes/${carla.participacionId}`);
    const otraVez = await ana.agente.post(`${base}/participantes`).send({ correo: carla.correo });
    expect(otraVez.status).toBe(201);
    expect(otraVez.body.participante.id).toBe(carla.participacionId);
  });
});
