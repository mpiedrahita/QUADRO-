/**
 * PI-04 · HU-04, HU-05 · RF-05 a RF-07 · DS-02: registrar gasto con su reparto.
 * PI-06 · HU-09 · RF-10 · RNF-02: editar y anular gastos según permisos.
 * PI-07 · HU-07 · RF-12: historial con filtros.
 */
import { describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool.js';
import { escenarioBase, hoy, registrarGasto } from '../helpers/api.js';

const todos = (e) => [e.ana, e.bruno, e.carla].map((p) => ({ participacionId: p.participacionId }));
const contarGastos = async (grupoId) => (await pool.query('SELECT count(*)::int AS n FROM gasto WHERE grupo_id = $1', [grupoId])).rows[0].n;
const saldoDe = (saldos, nombre) => saldos.find((s) => s.nombre === nombre).saldo;

describe('PI-04 · Registrar gasto con reparto (HU-04, HU-05)', () => {
  it('PI-04a · gasto válido queda REGISTRADO y sus repartos suman el importe', async () => {
    const e = await escenarioBase();
    const res = await registrarGasto(e.ana.agente, e.base, {
      descripcion: 'Harina de maíz',
      importe: 100000,
      categoriaId: e.categoria('Materia prima'),
      pagadorId: e.ana.participacionId,
      metodo: 'IGUAL',
      repartos: todos(e),
    });
    expect(res.status).toBe(201);
    const g = res.body.gasto;
    expect(g).toMatchObject({ descripcion: 'Harina de maíz', importe: 100000, estado: 'REGISTRADO', metodo: 'IGUAL', pagador: 'Ana', categoria: 'Materia prima' });
    expect(g.repartos.map((r) => [r.nombre, r.importeAsignado])).toEqual([
      ['Ana', 33334],
      ['Bruno', 33333],
      ['Carla', 33333],
    ]);
    const { rows } = await pool.query('SELECT SUM(importe_asignado)::int AS total FROM reparto_gasto WHERE gasto_id = $1', [g.id]);
    expect(rows[0].total).toBe(100000);
    // Aparece en el historial del grupo (criterio de aceptación de HU-04).
    const historial = await e.bruno.agente.get(`${e.base}/gastos`);
    expect(historial.body.gastos.map((x) => x.id)).toContain(g.id);
  });

  it('PI-04b · reparto por porcentajes y por valores específicos', async () => {
    const e = await escenarioBase();
    const pct = await registrarGasto(e.bruno.agente, e.base, {
      importe: 200000,
      categoriaId: e.categoria('Herramientas'),
      pagadorId: e.bruno.participacionId,
      metodo: 'PORCENTAJE',
      repartos: [
        { participacionId: e.ana.participacionId, porcentaje: 50 },
        { participacionId: e.bruno.participacionId, porcentaje: 30 },
        { participacionId: e.carla.participacionId, porcentaje: 20 },
      ],
    });
    expect(pct.status).toBe(201);
    expect(pct.body.gasto.repartos.map((r) => r.importeAsignado)).toEqual([100000, 60000, 40000]);

    const val = await registrarGasto(e.carla.agente, e.base, {
      importe: 75000,
      categoriaId: e.categoria('Transporte'),
      pagadorId: e.carla.participacionId,
      metodo: 'VALOR',
      repartos: [
        { participacionId: e.bruno.participacionId, valor: 25000 },
        { participacionId: e.carla.participacionId, valor: 50000 },
      ],
    });
    expect(val.status).toBe(201);
    expect(val.body.gasto.repartos.map((r) => [r.nombre, r.importeAsignado])).toEqual([
      ['Bruno', 25000],
      ['Carla', 50000],
    ]);
  });

  it('PI-04c · si el reparto es inválido no se guarda nada (transacción)', async () => {
    const e = await escenarioBase();
    const antes = await contarGastos(e.grupo.id);
    const res = await registrarGasto(e.ana.agente, e.base, {
      importe: 200000,
      categoriaId: e.categoria('Insumos'),
      pagadorId: e.ana.participacionId,
      metodo: 'PORCENTAJE',
      repartos: [
        { participacionId: e.ana.participacionId, porcentaje: 50 },
        { participacionId: e.bruno.participacionId, porcentaje: 40 },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.mensaje).toBe('Los porcentajes deben sumar 100 %. Actualmente suman 90 %.');
    expect(res.body.error.campos.repartos).toBeDefined();
    expect(await contarGastos(e.grupo.id)).toBe(antes);
  });

  it('PI-04d · valor en cero, datos faltantes o fecha futura muestran validación y no se registran', async () => {
    const e = await escenarioBase();
    const base = { categoriaId: e.categoria('Insumos'), pagadorId: e.ana.participacionId, metodo: 'IGUAL', repartos: todos(e) };
    const cero = await registrarGasto(e.ana.agente, e.base, { ...base, importe: 0 });
    expect(cero.status).toBe(400);
    expect(cero.body.error.campos.importe).toBe('El importe debe ser mayor que cero.');

    const sinDescripcion = await registrarGasto(e.ana.agente, e.base, { ...base, importe: 1000, descripcion: '' });
    expect(sinDescripcion.body.error.campos.descripcion).toBeDefined();

    const manana = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const futura = await registrarGasto(e.ana.agente, e.base, { ...base, importe: 1000, fecha: manana });
    expect(futura.status).toBe(400);
    expect(futura.body.error.campos.fecha).toBe('La fecha del gasto no puede ser posterior a hoy.');
    expect(await contarGastos(e.grupo.id)).toBe(0);
  });

  it('PI-04e · pagador, participantes o categoría de otro grupo se rechazan', async () => {
    const e = await escenarioBase('Grupo A');
    const otro = await escenarioBase('Grupo B');
    const base = { importe: 5000, categoriaId: e.categoria('Insumos'), pagadorId: e.ana.participacionId, metodo: 'IGUAL', repartos: todos(e) };

    const pagadorAjeno = await registrarGasto(e.ana.agente, e.base, { ...base, pagadorId: otro.ana.participacionId });
    expect(pagadorAjeno.body.error.campos.pagadorId).toBe('Quien pagó debe ser un integrante activo del grupo.');

    const repartoAjeno = await registrarGasto(e.ana.agente, e.base, { ...base, repartos: [{ participacionId: otro.bruno.participacionId }] });
    expect(repartoAjeno.status).toBe(400);

    const categoriaAjena = await registrarGasto(e.ana.agente, e.base, { ...base, categoriaId: otro.categoria('Insumos') });
    expect(categoriaAjena.body.error.campos.categoriaId).toBe('La categoría seleccionada no pertenece a este grupo.');
  });
});

describe('PI-06 · Editar o anular gasto (HU-09)', () => {
  async function conGasto() {
    const e = await escenarioBase();
    const { body } = await registrarGasto(e.bruno.agente, e.base, {
      descripcion: 'Bolsas y empaques',
      importe: 90000,
      categoriaId: e.categoria('Insumos'),
      pagadorId: e.bruno.participacionId,
      metodo: 'IGUAL',
      repartos: todos(e),
    });
    return { ...e, gasto: body.gasto };
  }

  it('PI-06a · editar el importe deja el gasto MODIFICADO y recalcula los saldos', async () => {
    const e = await conGasto();
    let saldos = (await e.ana.agente.get(`${e.base}/saldos`)).body.saldos;
    expect(saldoDe(saldos, 'Bruno')).toBe(60000);

    const res = await e.bruno.agente.put(`${e.base}/gastos/${e.gasto.id}`).send({
      descripcion: 'Bolsas y empaques (corregido)',
      importe: 120000,
      fecha: hoy(),
      categoriaId: e.categoria('Insumos'),
      pagadorId: e.bruno.participacionId,
      metodo: 'IGUAL',
      repartos: todos(e),
    });
    expect(res.status).toBe(200);
    expect(res.body.gasto).toMatchObject({ estado: 'MODIFICADO', importe: 120000 });
    expect(res.body.gasto.fechaModificacion).not.toBeNull();

    saldos = (await e.ana.agente.get(`${e.base}/saldos`)).body.saldos;
    expect(saldoDe(saldos, 'Bruno')).toBe(80000);
    expect(saldoDe(saldos, 'Ana')).toBe(-40000);
  });

  it('PI-06b · RNF-02: un integrante que no registró el gasto no puede modificarlo ni anularlo', async () => {
    const e = await conGasto();
    const editar = await e.carla.agente.put(`${e.base}/gastos/${e.gasto.id}`).send({
      descripcion: 'Cambio no autorizado',
      importe: 1,
      fecha: hoy(),
      categoriaId: e.categoria('Insumos'),
      pagadorId: e.carla.participacionId,
      metodo: 'IGUAL',
      repartos: todos(e),
    });
    expect(editar.status).toBe(403);
    expect(editar.body.error.mensaje).toBe('Solo quien registró el gasto o el administrador del grupo pueden modificarlo.');
    expect((await e.carla.agente.patch(`${e.base}/gastos/${e.gasto.id}/anular`)).status).toBe(403);
    // El gasto no cambió.
    const actual = (await e.ana.agente.get(`${e.base}/gastos/${e.gasto.id}`)).body.gasto;
    expect(actual).toMatchObject({ importe: 90000, estado: 'REGISTRADO' });
  });

  it('PI-06c · el administrador puede anular; el gasto anulado sale de los saldos y no se puede editar', async () => {
    const e = await conGasto();
    const anular = await e.ana.agente.patch(`${e.base}/gastos/${e.gasto.id}/anular`);
    expect(anular.status).toBe(200);
    expect(anular.body.gasto.estado).toBe('ANULADO');

    const saldos = (await e.ana.agente.get(`${e.base}/saldos`)).body.saldos;
    expect(saldos.every((s) => s.saldo === 0)).toBe(true);

    expect((await e.ana.agente.patch(`${e.base}/gastos/${e.gasto.id}/anular`)).status).toBe(409);
    const historial = (await e.ana.agente.get(`${e.base}/gastos`)).body.gastos;
    expect(historial).toHaveLength(0);
    const conAnulados = (await e.ana.agente.get(`${e.base}/gastos?incluirAnulados=true`)).body.gastos;
    expect(conAnulados[0].estado).toBe('ANULADO');
  });
});

describe('PI-07 · Historial con filtros (HU-07)', () => {
  it('PI-07a · filtrar por fecha, categoría y participante muestra solo los coincidentes', async () => {
    const e = await escenarioBase();
    const crear = (descripcion, fecha, categoria, pagador, repartos) =>
      registrarGasto(e.ana.agente, e.base, {
        descripcion,
        fecha,
        importe: 10000,
        categoriaId: e.categoria(categoria),
        pagadorId: pagador.participacionId,
        metodo: 'IGUAL',
        repartos: repartos.map((p) => ({ participacionId: p.participacionId })),
      });
    await crear('Gasto de septiembre', '2026-09-15', 'Insumos', e.ana, [e.ana, e.bruno]);
    await crear('Gasto de octubre', '2026-10-10', 'Transporte', e.bruno, [e.bruno, e.carla]);
    await crear('Gasto de noviembre', '2026-11-01', 'Insumos', e.ana, [e.ana]);

    const nombres = async (query) => (await e.carla.agente.get(`${e.base}/gastos${query}`)).body.gastos.map((g) => g.descripcion);

    expect(await nombres('')).toEqual(['Gasto de noviembre', 'Gasto de octubre', 'Gasto de septiembre']);
    expect(await nombres('?desde=2026-10-01&hasta=2026-10-31')).toEqual(['Gasto de octubre']);
    expect(await nombres(`?categoriaId=${e.categoria('Insumos')}`)).toEqual(['Gasto de noviembre', 'Gasto de septiembre']);
    expect(await nombres(`?participanteId=${e.carla.participacionId}`)).toEqual(['Gasto de octubre']);
    expect(await nombres(`?participanteId=${e.bruno.participacionId}&categoriaId=${e.categoria('Insumos')}`)).toEqual([
      'Gasto de septiembre',
    ]);
  });

  it('PI-07b · un rango de fechas invertido o un filtro mal formado se rechaza', async () => {
    const e = await escenarioBase();
    const rango = await e.ana.agente.get(`${e.base}/gastos?desde=2026-10-31&hasta=2026-10-01`);
    expect(rango.status).toBe(400);
    expect(rango.body.error.campos.desde).toBe('La fecha inicial no puede ser posterior a la fecha final.');
    const inyeccion = await e.ana.agente.get(`${e.base}/gastos?categoriaId=${encodeURIComponent("1' OR '1'='1")}`);
    expect(inyeccion.status).toBe(400);
  });
});
