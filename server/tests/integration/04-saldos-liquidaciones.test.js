/**
 * PI-05 · HU-06 · RF-08, RF-17, RNF-04 · DS-03: consulta de saldos y privacidad.
 * PI-08 · HU-13 · RF-19 · Actividad 8.3: registro de liquidaciones.
 */
import { describe, expect, it } from 'vitest';
import { escenarioBase, hoy, nuevoUsuario, registrarGasto } from '../helpers/api.js';

const todos = (e) => [e.ana, e.bruno, e.carla].map((p) => ({ participacionId: p.participacionId }));
const porNombre = (saldos) => Object.fromEntries(saldos.map((s) => [s.nombre, s.saldo]));

async function anaPaga90mil() {
  const e = await escenarioBase();
  await registrarGasto(e.ana.agente, e.base, {
    descripcion: 'Harina y queso',
    importe: 90000,
    categoriaId: e.categoria('Materia prima'),
    pagadorId: e.ana.participacionId,
    metodo: 'IGUAL',
    repartos: todos(e),
  });
  return e;
}

describe('PI-05 · Consultar saldos (HU-06)', () => {
  it('PI-05a · el integrante ve aportes, obligaciones, saldos, deudas y resumen', async () => {
    const e = await anaPaga90mil();
    const res = await e.bruno.agente.get(`${e.base}/saldos`);
    expect(res.status).toBe(200);
    expect(porNombre(res.body.saldos)).toEqual({ Ana: 60000, Bruno: -30000, Carla: -30000 });
    expect(res.body.miSaldo).toEqual({ pagado: 0, asignado: 30000, enviado: 0, recibido: 0, saldo: -30000 });
    expect(res.body.deudas.map((d) => `${d.deudor}→${d.acreedor}:${d.importe}`).sort()).toEqual(['Bruno→Ana:30000', 'Carla→Ana:30000']);
    expect(res.body.resumen).toMatchObject({
      totalGastado: 90000,
      numeroGastos: 1,
      deudaPendiente: 60000,
      hayMovimientos: true,
      porCategoria: [{ nombre: 'Materia prima', total: 90000, cantidad: 1 }],
    });
  });

  it('PI-05b · RNF-04: un usuario de otro grupo no ve nada', async () => {
    const e = await anaPaga90mil();
    const externo = await nuevoUsuario('Externo');
    for (const ruta of ['', '/saldos', '/gastos', '/participantes', '/liquidaciones', '/categorias']) {
      const res = await externo.agente.get(`${e.base}${ruta}`);
      expect(res.status, ruta).toBe(404);
      expect(res.body.error.mensaje).toBe('El grupo no existe o no perteneces a él.');
      expect(JSON.stringify(res.body)).not.toMatch(/Harina|Ana|90000/);
    }
  });

  it('PI-05c · sin movimientos se muestran valores iniciales en cero', async () => {
    const e = await escenarioBase();
    const { body } = await e.ana.agente.get(`${e.base}/saldos`);
    expect(body.resumen).toMatchObject({ totalGastado: 0, numeroGastos: 0, hayMovimientos: false });
    expect(body.saldos).toHaveLength(3);
    expect(body.saldos.every((s) => s.saldo === 0 && s.pagado === 0 && s.asignado === 0)).toBe(true);
    expect(body.deudas).toEqual([]);
  });
});

describe('PI-08 · Registrar liquidación (HU-13)', () => {
  const liquidar = (agente, e, datos) => agente.post(`${e.base}/liquidaciones`).send({ fecha: hoy(), ...datos });

  it('PI-08a · una liquidación válida queda guardada y actualiza los saldos', async () => {
    const e = await anaPaga90mil();
    const res = await liquidar(e.bruno.agente, e, {
      emisorId: e.bruno.participacionId,
      receptorId: e.ana.participacionId,
      importe: 30000,
      nota: 'Transferencia Nequi',
    });
    expect(res.status).toBe(201);
    expect(res.body.liquidacion).toMatchObject({ emisor: 'Bruno', receptor: 'Ana', importe: 30000, estado: 'REGISTRADA' });

    const { body } = await e.ana.agente.get(`${e.base}/saldos`);
    expect(porNombre(body.saldos)).toEqual({ Ana: 30000, Bruno: 0, Carla: -30000 });
    expect(body.deudas).toHaveLength(1);
    expect(body.resumen.totalLiquidado).toBe(30000);
  });

  it('PI-08b · un pago parcial deja el resto de la deuda pendiente', async () => {
    const e = await anaPaga90mil();
    await liquidar(e.carla.agente, e, { emisorId: e.carla.participacionId, receptorId: e.ana.participacionId, importe: 10000 });
    const { body } = await e.carla.agente.get(`${e.base}/saldos`);
    expect(body.deudas.find((d) => d.deudor === 'Carla').importe).toBe(20000);
  });

  it('PI-08c · un importe que supera la deuda o una deuda inexistente se rechazan', async () => {
    const e = await anaPaga90mil();
    const excede = await liquidar(e.bruno.agente, e, { emisorId: e.bruno.participacionId, receptorId: e.ana.participacionId, importe: 30001 });
    expect(excede.status).toBe(400);
    expect(excede.body.error.campos.importe).toMatch(/supera la deuda pendiente \(\$\s?30\.000\)/);

    const alReves = await liquidar(e.ana.agente, e, { emisorId: e.ana.participacionId, receptorId: e.bruno.participacionId, importe: 1000 });
    expect(alReves.status).toBe(409);
    expect(alReves.body.error.mensaje).toBe('Ana no tiene una deuda pendiente con Bruno.');

    const mismo = await liquidar(e.ana.agente, e, { emisorId: e.ana.participacionId, receptorId: e.ana.participacionId, importe: 1000 });
    expect(mismo.status).toBe(400);
    expect(mismo.body.error.campos.receptorId).toBe('Quien paga y quien recibe deben ser personas distintas.');
  });

  it('PI-08d · un integrante no involucrado no puede registrar la liquidación de otros; el administrador sí', async () => {
    const e = await anaPaga90mil();
    // Carla intenta registrar un pago de Bruno a Ana.
    const ajena = await liquidar(e.carla.agente, e, { emisorId: e.bruno.participacionId, receptorId: e.ana.participacionId, importe: 5000 });
    expect(ajena.status).toBe(403);
    expect(ajena.body.error.mensaje).toBe('Solo los integrantes involucrados o el administrador pueden registrar esta liquidación.');
    // Deuda de Carla con Bruno: Ana (administradora) no participa en ella, pero puede registrarla.
    await registrarGasto(e.bruno.agente, e.base, {
      importe: 20000,
      categoriaId: e.categoria('Transporte'),
      pagadorId: e.bruno.participacionId,
      metodo: 'IGUAL',
      repartos: [{ participacionId: e.bruno.participacionId }, { participacionId: e.carla.participacionId }],
    });
    const admin = await liquidar(e.ana.agente, e, { emisorId: e.carla.participacionId, receptorId: e.bruno.participacionId, importe: 10000 });
    expect(admin.status).toBe(201);
    expect(admin.body.liquidacion.registradoPor).toBe('Ana');
  });

  it('PI-08e · anular una liquidación devuelve la deuda a su estado anterior', async () => {
    const e = await anaPaga90mil();
    const { body } = await liquidar(e.bruno.agente, e, { emisorId: e.bruno.participacionId, receptorId: e.ana.participacionId, importe: 30000 });
    const anular = await e.bruno.agente.patch(`${e.base}/liquidaciones/${body.liquidacion.id}/anular`);
    expect(anular.status).toBe(200);
    expect(anular.body.liquidacion.estado).toBe('ANULADA');
    const saldos = (await e.ana.agente.get(`${e.base}/saldos`)).body.saldos;
    expect(porNombre(saldos).Bruno).toBe(-30000);
    expect((await e.carla.agente.patch(`${e.base}/liquidaciones/${body.liquidacion.id}/anular`)).status).toBe(403);
    const lista = (await e.carla.agente.get(`${e.base}/liquidaciones`)).body.liquidaciones;
    expect(lista).toHaveLength(1);
  });
});
