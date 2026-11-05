/**
 * Pruebas unitarias de la distribución de gastos (HU-05 · RF-06 · RF-07 · RNF-03).
 * Los ID PU-xx corresponden al plan preliminar de pruebas del Entregable 2.
 */
import { describe, expect, it } from 'vitest';
import { calcularReparto } from '../../src/domain/reparto.js';

const ids = ['ana', 'bruno', 'carla'];
const tres = (extra = []) => ids.map((participacionId, i) => ({ participacionId, ...(extra[i] ?? {}) }));
const importes = (reparto) => reparto.map((r) => r.importeAsignado);
const suma = (reparto) => importes(reparto).reduce((a, b) => a + b, 0);

describe('Reparto en partes iguales', () => {
  it('PU-01 · $90.000 entre 3 → tres repartos de $30.000', () => {
    const r = calcularReparto({ importe: 90000, metodo: 'IGUAL', participantes: tres() });
    expect(importes(r)).toEqual([30000, 30000, 30000]);
  });

  it('PU-02 · $100.000 entre 3 → 33.334, 33.333 y 33.333 (suman $100.000)', () => {
    const r = calcularReparto({ importe: 100000, metodo: 'IGUAL', participantes: tres() });
    expect(importes(r)).toEqual([33334, 33333, 33333]);
    expect(suma(r)).toBe(100000);
  });

  it('PU-09 · $100.001 entre 3 → los dos pesos sobrantes van a los dos primeros', () => {
    const r = calcularReparto({ importe: 100001, metodo: 'IGUAL', participantes: tres() });
    expect(importes(r)).toEqual([33334, 33334, 33333]);
  });

  it('PU-10 · un solo participante asume todo el gasto', () => {
    const r = calcularReparto({ importe: 45000, metodo: 'IGUAL', participantes: [{ participacionId: 'ana' }] });
    expect(importes(r)).toEqual([45000]);
  });
});

describe('Reparto por porcentajes', () => {
  it('PU-03 · $200.000 con 50 %, 30 % y 20 % → $100.000, $60.000 y $40.000', () => {
    const r = calcularReparto({
      importe: 200000,
      metodo: 'PORCENTAJE',
      participantes: tres([{ porcentaje: 50 }, { porcentaje: 30 }, { porcentaje: 20 }]),
    });
    expect(importes(r)).toEqual([100000, 60000, 40000]);
    expect(r.map((x) => x.porcentaje)).toEqual([50, 30, 20]);
  });

  it('PU-04 · porcentajes que suman 90 % → se rechaza el reparto', () => {
    expect(() =>
      calcularReparto({
        importe: 200000,
        metodo: 'PORCENTAJE',
        participantes: tres([{ porcentaje: 50 }, { porcentaje: 30 }, { porcentaje: 10 }]),
      })
    ).toThrow('Los porcentajes deben sumar 100 %. Actualmente suman 90 %.');
  });

  it('PU-11 · porcentajes con decimales: el redondeo conserva el total (mayor residuo)', () => {
    const r = calcularReparto({
      importe: 100000,
      metodo: 'PORCENTAJE',
      participantes: tres([{ porcentaje: 33.33 }, { porcentaje: 33.33 }, { porcentaje: 33.34 }]),
    });
    expect(importes(r)).toEqual([33330, 33330, 33340]);
    expect(suma(r)).toBe(100000);
  });

  it('PU-12 · importe no divisible por porcentaje: la suma sigue siendo exacta', () => {
    const r = calcularReparto({
      importe: 10001,
      metodo: 'PORCENTAJE',
      participantes: tres([{ porcentaje: 33.33 }, { porcentaje: 33.33 }, { porcentaje: 33.34 }]),
    });
    expect(suma(r)).toBe(10001);
    expect(importes(r)).toEqual([3333, 3333, 3335]);
  });

  it('PU-13 · porcentaje cero, negativo o con más de dos decimales → se rechaza', () => {
    const base = { importe: 1000, metodo: 'PORCENTAJE' };
    expect(() => calcularReparto({ ...base, participantes: tres([{ porcentaje: 0 }, { porcentaje: 50 }, { porcentaje: 50 }]) })).toThrow(
      'mayor que 0'
    );
    expect(() => calcularReparto({ ...base, participantes: tres([{ porcentaje: -10 }, { porcentaje: 60 }, { porcentaje: 50 }]) })).toThrow(
      'mayor que 0'
    );
    expect(() =>
      calcularReparto({ ...base, participantes: tres([{ porcentaje: 33.333 }, { porcentaje: 33.333 }, { porcentaje: 33.334 }]) })
    ).toThrow('dos decimales');
  });
});

describe('Reparto por valores específicos', () => {
  it('PU-14 · valores que suman el importe se aceptan tal cual', () => {
    const r = calcularReparto({
      importe: 150000,
      metodo: 'VALOR',
      participantes: tres([{ valor: 70000 }, { valor: 50000 }, { valor: 30000 }]),
    });
    expect(importes(r)).toEqual([70000, 50000, 30000]);
  });

  it('PU-15 · valores que no suman el importe → se rechaza con el detalle', () => {
    expect(() =>
      calcularReparto({ importe: 150000, metodo: 'VALOR', participantes: tres([{ valor: 70000 }, { valor: 50000 }, { valor: 20000 }]) })
    ).toThrow(/La suma de los valores \(\$\s?140\.000\) debe ser igual al importe del gasto \(\$\s?150\.000\)/);
  });

  it('PU-16 · valores con decimales o en cero → se rechaza', () => {
    expect(() =>
      calcularReparto({ importe: 1000, metodo: 'VALOR', participantes: tres([{ valor: 500.5 }, { valor: 499.5 }, { valor: 0 }]) })
    ).toThrow('entero mayor que cero');
  });
});

describe('Validaciones generales del reparto', () => {
  it('PU-05 · importe en $0 o negativo → se rechaza el gasto', () => {
    expect(() => calcularReparto({ importe: 0, metodo: 'IGUAL', participantes: tres() })).toThrow('mayor que cero');
    expect(() => calcularReparto({ importe: -5000, metodo: 'IGUAL', participantes: tres() })).toThrow('mayor que cero');
  });

  it('PU-17 · importe con centavos → se rechaza (se manejan pesos enteros)', () => {
    expect(() => calcularReparto({ importe: 1000.5, metodo: 'IGUAL', participantes: tres() })).toThrow('entero');
  });

  it('PU-18 · sin participantes o con participantes repetidos → se rechaza', () => {
    expect(() => calcularReparto({ importe: 1000, metodo: 'IGUAL', participantes: [] })).toThrow('al menos un participante');
    expect(() =>
      calcularReparto({ importe: 1000, metodo: 'IGUAL', participantes: [{ participacionId: 'ana' }, { participacionId: 'ana' }] })
    ).toThrow('dos veces');
  });

  it('PU-19 · método desconocido → se rechaza', () => {
    expect(() => calcularReparto({ importe: 1000, metodo: 'OTRO', participantes: tres() })).toThrow('método');
  });

  it('PU-20 · propiedad: para importes aleatorios la suma del reparto igual siempre es el total', () => {
    for (let i = 0; i < 500; i++) {
      const importe = 1 + Math.floor(Math.random() * 5_000_000);
      const n = 1 + Math.floor(Math.random() * 12);
      const participantes = Array.from({ length: n }, (_, k) => ({ participacionId: `p${k}` }));
      const r = calcularReparto({ importe, metodo: 'IGUAL', participantes });
      expect(suma(r)).toBe(importe);
      expect(Math.max(...importes(r)) - Math.min(...importes(r))).toBeLessThanOrEqual(1);
    }
  });
});
