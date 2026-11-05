/**
 * Pruebas unitarias de las reglas de validación de entrada (RNF-05) y de archivos (RNF-09).
 */
import { describe, expect, it } from 'vitest';
import { esquemaGrupo } from '../../src/modules/grupos/grupos.schemas.js';
import { esquemaLogin, esquemaRegistro } from '../../src/modules/auth/auth.schemas.js';
import { esquemaGasto } from '../../src/modules/gastos/gastos.schemas.js';
import { detectarTipo, limpiarNombre } from '../../src/modules/comprobantes/comprobantes.service.js';
import { esFechaValida } from '../../src/utils/fechas.js';

const errores = (resultado) => Object.fromEntries(resultado.error.issues.map((i) => [i.path.join('.'), i.message]));

describe('Grupo', () => {
  it('PU-08 · crear un grupo sin nombre → se rechaza el grupo', () => {
    const r = esquemaGrupo.safeParse({ nombre: '   ' });
    expect(r.success).toBe(false);
    expect(errores(r).nombre).toBe('El nombre del grupo debe tener al menos 3 caracteres.');
    expect(errores(esquemaGrupo.safeParse({})).nombre).toBe('El nombre del grupo es obligatorio.');
  });

  it('PU-28 · el nombre se recorta y la descripción vacía queda en null', () => {
    const r = esquemaGrupo.safeParse({ nombre: '  Panadería Doña Rosa ', descripcion: '' });
    expect(r.data).toEqual({ nombre: 'Panadería Doña Rosa', descripcion: null });
  });
});

describe('Registro e inicio de sesión', () => {
  it('PU-29 · registro con datos inválidos informa cada campo', () => {
    const r = esquemaRegistro.safeParse({ nombre: 'A', correo: 'no-es-correo', contrasena: 'abcdefgh' });
    expect(errores(r)).toEqual({
      nombre: 'El nombre debe tener al menos 2 caracteres.',
      correo: 'Ingresa un correo electrónico válido.',
      contrasena: 'La contraseña debe incluir al menos una letra y un número.',
    });
  });

  it('PU-30 · el correo se normaliza a minúsculas y sin espacios', () => {
    const r = esquemaLogin.safeParse({ correo: '  Ana@Correo.COM ', contrasena: 'x' });
    expect(r.data.correo).toBe('ana@correo.com');
  });
});

describe('Gasto', () => {
  const valido = {
    descripcion: 'Harina de maíz',
    importe: 90000,
    fecha: '2026-10-01',
    categoriaId: '7a4c2b1e-1d1f-4b44-9c0e-2f1a1b1c1d1e',
    pagadorId: '7a4c2b1e-1d1f-4b44-9c0e-2f1a1b1c1d1f',
    metodo: 'IGUAL',
    repartos: [{ participacionId: '7a4c2b1e-1d1f-4b44-9c0e-2f1a1b1c1d1f' }],
  };

  it('PU-31 · un gasto completo es válido', () => {
    expect(esquemaGasto.safeParse(valido).success).toBe(true);
  });

  it('PU-32 · gasto sin descripción, sin categoría y con fecha imposible → errores por campo', () => {
    const r = esquemaGasto.safeParse({ ...valido, descripcion: '', categoriaId: undefined, fecha: '2026-02-30' });
    const e = errores(r);
    expect(e.descripcion).toMatch(/al menos 3 caracteres/);
    expect(e.categoriaId).toBe('La categoría es obligatoria.');
    expect(e.fecha).toMatch(/fecha real/);
  });

  it('PU-33 · importe en texto con centavos → se rechaza', () => {
    const e = errores(esquemaGasto.safeParse({ ...valido, importe: '1500.50' }));
    expect(e.importe).toMatch(/entero/);
  });
});

describe('Archivos de comprobantes (RNF-09)', () => {
  it('PU-34 · se reconoce el tipo real por la firma del archivo', () => {
    expect(detectarTipo(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe('image/png');
    expect(detectarTipo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(detectarTipo(Buffer.from('%PDF-1.7 contenido'))).toBe('application/pdf');
    expect(detectarTipo(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 '))).toBe('image/webp');
  });

  it('PU-35 · un archivo de texto renombrado como imagen no se acepta', () => {
    expect(detectarTipo(Buffer.from('esto es un texto plano disfrazado'))).toBeNull();
  });

  it('PU-36 · el nombre del archivo se limpia de rutas y caracteres peligrosos', () => {
    expect(limpiarNombre('../../etc/passwd')).toBe('passwd');
    expect(limpiarNombre('factura <script>.pdf')).toBe('factura _script_.pdf');
    expect(limpiarNombre('Recibo Panadería Nº 12.jpg')).toBe('Recibo Panadería Nº 12.jpg');
  });
});

describe('Fechas', () => {
  it('PU-37 · solo se aceptan fechas reales AAAA-MM-DD', () => {
    expect(esFechaValida('2026-11-04')).toBe(true);
    expect(esFechaValida('2026-02-29')).toBe(false);
    expect(esFechaValida('2024-02-29')).toBe(true);
    expect(esFechaValida('04/11/2026')).toBe(false);
  });
});
