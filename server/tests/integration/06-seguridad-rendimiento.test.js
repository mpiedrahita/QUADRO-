/**
 * Requisitos no funcionales verificables en la API:
 *  RNF-05 mensajes comprensibles ante errores · RNF-01/04 protección de rutas
 *  RNF-06 tiempos de respuesta con un volumen de datos documentado.
 */
import request from 'supertest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { app, escenarioBase, registrarGasto } from '../helpers/api.js';

describe('PI-11 · Manejo de errores y seguridad básica', () => {
  it('PI-11a · JSON mal formado, rutas inexistentes e identificadores inválidos responden con mensajes claros', async () => {
    const e = await escenarioBase();
    const malformado = await e.ana.agente.post(`${e.base}/gastos`).set('Content-Type', 'application/json').send('{"importe": ');
    expect(malformado.status).toBe(400);
    expect(malformado.body.error.mensaje).toBe('El cuerpo de la solicitud no es un JSON válido.');

    const ruta = await request(app).get('/api/no-existe');
    expect(ruta.status).toBe(404);

    const idInvalido = await e.ana.agente.get('/api/grupos/123/saldos');
    expect(idInvalido.status).toBe(404);

    const gastoInvalido = await e.ana.agente.get(`${e.base}/gastos/no-es-uuid`);
    expect(gastoInvalido.status).toBe(400);
  });

  it('PI-11b · las respuestas incluyen cabeceras de seguridad y no exponen la tecnología', async () => {
    const res = await request(app).get('/api/salud');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('PI-11c · un texto con intento de inyección SQL se guarda como texto literal', async () => {
    const e = await escenarioBase();
    const descripcion = "Insumos'); DROP TABLE gasto; --";
    const res = await registrarGasto(e.ana.agente, e.base, {
      descripcion,
      importe: 1000,
      categoriaId: e.categoria('Insumos'),
      pagadorId: e.ana.participacionId,
      metodo: 'IGUAL',
      repartos: [{ participacionId: e.ana.participacionId }],
    });
    expect(res.status).toBe(201);
    const lista = await e.ana.agente.get(`${e.base}/gastos`);
    expect(lista.body.gastos[0].descripcion).toBe(descripcion);
  });
});

describe('RNF-06 · Rendimiento de las operaciones principales', () => {
  it('RNF-06 · con 150 gastos y 3 integrantes, historial y saldos responden en menos de 500 ms', async () => {
    const e = await escenarioBase('Grupo con volumen');
    const repartos = [e.ana, e.bruno, e.carla].map((p) => ({ participacionId: p.participacionId }));
    const pagadores = [e.ana, e.bruno, e.carla];
    for (let i = 0; i < 150; i++) {
      await registrarGasto(pagadores[i % 3].agente, e.base, {
        descripcion: `Compra número ${i + 1}`,
        importe: 1000 + i * 37,
        categoriaId: e.categoria(i % 2 ? 'Insumos' : 'Transporte'),
        pagadorId: pagadores[i % 3].participacionId,
        metodo: 'IGUAL',
        repartos,
      });
    }
    const medir = async (ruta) => {
      const inicio = performance.now();
      const res = await e.ana.agente.get(ruta);
      const ms = performance.now() - inicio;
      expect(res.status).toBe(200);
      return ms;
    };
    // Primera llamada de calentamiento y luego 5 mediciones; se toma la mayor.
    await medir(`${e.base}/saldos`);
    const tiempos = { saldos: [], historial: [] };
    for (let i = 0; i < 5; i++) {
      tiempos.saldos.push(await medir(`${e.base}/saldos`));
      tiempos.historial.push(await medir(`${e.base}/gastos`));
    }
    const peor = { saldos: Math.max(...tiempos.saldos), historial: Math.max(...tiempos.historial) };
    // Se guarda la medición real para el reporte de pruebas.
    const carpeta = new URL('../reports/', import.meta.url);
    mkdirSync(carpeta, { recursive: true });
    writeFileSync(
      new URL('rnf06-rendimiento.json', carpeta),
      JSON.stringify(
        {
          fecha: new Date().toISOString(),
          condiciones: '150 gastos, 3 integrantes, PostgreSQL 16 local, Node.js ' + process.version,
          umbralMs: 500,
          medicionesMs: tiempos,
          peorMs: peor,
        },
        null,
        2
      )
    );
    expect(peor.saldos).toBeLessThan(500);
    expect(peor.historial).toBeLessThan(500);
  }, 60000);
});
