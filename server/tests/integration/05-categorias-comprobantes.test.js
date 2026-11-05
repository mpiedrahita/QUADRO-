/**
 * PI-09 · HU-10 · RF-11: administración de categorías.
 * PI-10 · HU-08 · RF-09 · RNF-09: comprobantes adjuntos.
 */
import { describe, expect, it } from 'vitest';
import { escenarioBase, registrarGasto } from '../helpers/api.js';

// PNG válido de 1×1 píxel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF');

describe('PI-09 · Administrar categorías (HU-10)', () => {
  it('PI-09a · el administrador crea una categoría válida y queda disponible para clasificar gastos', async () => {
    const e = await escenarioBase();
    const res = await e.ana.agente.post(`${e.base}/categorias`).send({ nombre: '  Publicidad ' });
    expect(res.status).toBe(201);
    expect(res.body.categoria.nombre).toBe('Publicidad');
    const gasto = await registrarGasto(e.bruno.agente, e.base, {
      importe: 15000,
      categoriaId: res.body.categoria.id,
      pagadorId: e.bruno.participacionId,
      metodo: 'IGUAL',
      repartos: [{ participacionId: e.bruno.participacionId }],
    });
    expect(gasto.body.gasto.categoria).toBe('Publicidad');
  });

  it('PI-09b · nombre inválido o repetido solicita corregirlo; un integrante no puede crearlas', async () => {
    const e = await escenarioBase();
    const corto = await e.ana.agente.post(`${e.base}/categorias`).send({ nombre: 'A' });
    expect(corto.status).toBe(400);
    expect(corto.body.error.campos.nombre).toBe('El nombre de la categoría debe tener al menos 2 caracteres.');
    const repetido = await e.ana.agente.post(`${e.base}/categorias`).send({ nombre: 'INSUMOS' });
    expect(repetido.status).toBe(409);
    expect((await e.bruno.agente.post(`${e.base}/categorias`).send({ nombre: 'Varios' })).status).toBe(403);
  });

  it('PI-09c · se puede renombrar; solo se elimina si no tiene gastos', async () => {
    const e = await escenarioBase();
    const ren = await e.ana.agente.patch(`${e.base}/categorias/${e.categoria('Otros')}`).send({ nombre: 'Imprevistos' });
    expect(ren.body.categoria.nombre).toBe('Imprevistos');

    await registrarGasto(e.ana.agente, e.base, {
      importe: 5000,
      categoriaId: e.categoria('Transporte'),
      pagadorId: e.ana.participacionId,
      metodo: 'IGUAL',
      repartos: [{ participacionId: e.ana.participacionId }],
    });
    const enUso = await e.ana.agente.delete(`${e.base}/categorias/${e.categoria('Transporte')}`);
    expect(enUso.status).toBe(409);
    expect(enUso.body.error.mensaje).toMatch(/tiene 1 gasto\(s\) asociado\(s\)/);
    expect((await e.ana.agente.delete(`${e.base}/categorias/${e.categoria('Herramientas')}`)).status).toBe(204);
  });
});

describe('PI-10 · Adjuntar comprobante (HU-08)', () => {
  async function conGasto() {
    const e = await escenarioBase();
    const { body } = await registrarGasto(e.bruno.agente, e.base, {
      importe: 48000,
      categoriaId: e.categoria('Insumos'),
      pagadorId: e.bruno.participacionId,
      metodo: 'IGUAL',
      repartos: [{ participacionId: e.ana.participacionId }, { participacionId: e.bruno.participacionId }],
    });
    return { ...e, ruta: `${e.base}/gastos/${body.gasto.id}/comprobantes`, gastoId: body.gasto.id };
  }

  it('PI-10a · un archivo permitido queda asociado al gasto y puede consultarse', async () => {
    const e = await conGasto();
    const res = await e.bruno.agente.post(e.ruta).attach('archivo', PNG, 'factura insumos.png');
    expect(res.status).toBe(201);
    expect(res.body.comprobante).toMatchObject({ nombreArchivo: 'factura insumos.png', tipoMime: 'image/png', tamanoBytes: PNG.length });

    const pdf = await e.ana.agente.post(e.ruta).attach('archivo', PDF, 'recibo.pdf');
    expect(pdf.status).toBe(201);

    const lista = await e.carla.agente.get(e.ruta);
    expect(lista.body.comprobantes.map((c) => c.nombreArchivo)).toEqual(['factura insumos.png', 'recibo.pdf']);

    const archivo = await e.carla.agente.get(`${e.ruta}/${res.body.comprobante.id}/archivo`).buffer(true);
    expect(archivo.status).toBe(200);
    expect(archivo.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(archivo.body, PNG)).toBe(0);

    const gasto = (await e.ana.agente.get(`${e.base}/gastos/${e.gastoId}`)).body.gasto;
    expect(gasto.comprobantes).toBe(2);
  });

  it('PI-10b · formatos no admitidos y archivos que superan 2 MB se rechazan', async () => {
    const e = await conGasto();
    const disfrazado = await e.bruno.agente.post(e.ruta).attach('archivo', Buffer.from('MZ ejecutable o texto cualquiera'), 'foto.png');
    expect(disfrazado.status).toBe(400);
    expect(disfrazado.body.error.mensaje).toBe('Formato no permitido. Adjunta una imagen JPG, PNG o WEBP, o un PDF.');

    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const pesado = await e.bruno.agente.post(e.ruta).attach('archivo', grande, 'grande.png');
    expect(pesado.status).toBe(400);
    expect(pesado.body.error.mensaje).toBe('El archivo supera el tamaño máximo permitido (2 MB).');

    const vacio = await e.bruno.agente.post(e.ruta);
    expect(vacio.status).toBe(400);
    expect((await e.ana.agente.get(e.ruta)).body.comprobantes).toEqual([]);
  });

  it('PI-10c · solo quien lo subió, quien registró el gasto o el administrador pueden eliminarlo', async () => {
    const e = await conGasto();
    const { body } = await e.bruno.agente.post(e.ruta).attach('archivo', PNG, 'f.png');
    expect((await e.carla.agente.delete(`${e.ruta}/${body.comprobante.id}`)).status).toBe(403);
    expect((await e.ana.agente.delete(`${e.ruta}/${body.comprobante.id}`)).status).toBe(204);
  });

  it('PI-10d · no se adjuntan comprobantes a un gasto anulado', async () => {
    const e = await conGasto();
    await e.bruno.agente.patch(`${e.base}/gastos/${e.gastoId}/anular`);
    const res = await e.bruno.agente.post(e.ruta).attach('archivo', PNG, 'f.png');
    expect(res.status).toBe(409);
  });
});
