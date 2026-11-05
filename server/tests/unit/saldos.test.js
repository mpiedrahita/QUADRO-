/**
 * Pruebas unitarias del cálculo de saldos y deudas (HU-06 · RF-08 · HU-13 · RF-19).
 */
import { describe, expect, it } from 'vitest';
import { calcularDeudas, calcularSaldos, deudaEntre } from '../../src/domain/saldos.js';

const gasto = (pagadorId, importe, partes, estado = 'REGISTRADO') => ({
  pagadorId,
  importe,
  estado,
  repartos: Object.entries(partes).map(([participacionId, importeAsignado]) => ({ participacionId, importeAsignado })),
});
const saldo = (mapa, id) => mapa.get(id).saldo;

describe('Saldos individuales', () => {
  it('PU-06 · Ana paga $90.000 repartidos entre 3 → Ana +$60.000, Bruno −$30.000, Carla −$30.000', () => {
    const saldos = calcularSaldos({ gastos: [gasto('ana', 90000, { ana: 30000, bruno: 30000, carla: 30000 })] });
    expect(saldo(saldos, 'ana')).toBe(60000);
    expect(saldo(saldos, 'bruno')).toBe(-30000);
    expect(saldo(saldos, 'carla')).toBe(-30000);
    expect(saldos.get('ana')).toMatchObject({ pagado: 90000, asignado: 30000 });
  });

  it('PU-07 · grupo sin gastos → todos los saldos en $0', () => {
    const saldos = calcularSaldos({ participacionIds: ['ana', 'bruno', 'carla'] });
    for (const id of ['ana', 'bruno', 'carla']) {
      expect(saldos.get(id)).toEqual({ pagado: 0, asignado: 0, enviado: 0, recibido: 0, saldo: 0 });
    }
  });

  it('PU-21 · los gastos anulados no afectan los saldos', () => {
    const saldos = calcularSaldos({
      participacionIds: ['ana', 'bruno'],
      gastos: [gasto('ana', 50000, { ana: 25000, bruno: 25000 }, 'ANULADO')],
    });
    expect(saldo(saldos, 'ana')).toBe(0);
    expect(saldo(saldos, 'bruno')).toBe(0);
  });

  it('PU-22 · una liquidación de Bruno a Ana reduce ambas posiciones', () => {
    const saldos = calcularSaldos({
      gastos: [gasto('ana', 90000, { ana: 30000, bruno: 30000, carla: 30000 })],
      liquidaciones: [{ emisorId: 'bruno', receptorId: 'ana', importe: 30000, estado: 'REGISTRADA' }],
    });
    expect(saldo(saldos, 'ana')).toBe(30000);
    expect(saldo(saldos, 'bruno')).toBe(0);
    expect(saldo(saldos, 'carla')).toBe(-30000);
  });

  it('PU-23 · invariante: la suma de los saldos del grupo siempre es 0', () => {
    const saldos = calcularSaldos({
      gastos: [
        gasto('ana', 100000, { ana: 33334, bruno: 33333, carla: 33333 }),
        gasto('bruno', 75000, { bruno: 25000, carla: 50000 }),
        gasto('carla', 12000, { ana: 12000 }),
      ],
      liquidaciones: [{ emisorId: 'carla', receptorId: 'ana', importe: 10000, estado: 'REGISTRADA' }],
    });
    const total = [...saldos.values()].reduce((a, s) => a + s.saldo, 0);
    expect(total).toBe(0);
  });
});

describe('Deudas entre integrantes', () => {
  it('PU-24 · cada participante le debe su parte a quien pagó', () => {
    const deudas = calcularDeudas({ gastos: [gasto('ana', 90000, { ana: 30000, bruno: 30000, carla: 30000 })] });
    expect(deudaEntre(deudas, 'bruno', 'ana')).toBe(30000);
    expect(deudaEntre(deudas, 'carla', 'ana')).toBe(30000);
    expect(deudaEntre(deudas, 'ana', 'bruno')).toBe(0);
  });

  it('PU-25 · deudas cruzadas entre dos personas se compensan', () => {
    const deudas = calcularDeudas({
      gastos: [gasto('ana', 60000, { ana: 30000, bruno: 30000 }), gasto('bruno', 20000, { ana: 10000, bruno: 10000 })],
    });
    expect(deudas).toEqual([{ deudorId: 'bruno', acreedorId: 'ana', importe: 20000 }]);
  });

  it('PU-26 · una liquidación total cancela la deuda y las anuladas no cuentan', () => {
    const gastos = [gasto('ana', 90000, { ana: 30000, bruno: 30000, carla: 30000 })];
    const deudas = calcularDeudas({
      gastos,
      liquidaciones: [
        { emisorId: 'bruno', receptorId: 'ana', importe: 30000, estado: 'REGISTRADA' },
        { emisorId: 'carla', receptorId: 'ana', importe: 30000, estado: 'ANULADA' },
      ],
    });
    expect(deudaEntre(deudas, 'bruno', 'ana')).toBe(0);
    expect(deudaEntre(deudas, 'carla', 'ana')).toBe(30000);
  });

  it('PU-27 · las deudas son coherentes con los saldos netos', () => {
    const gastos = [
      gasto('ana', 100000, { ana: 33334, bruno: 33333, carla: 33333 }),
      gasto('bruno', 75000, { bruno: 25000, carla: 50000 }),
    ];
    const saldos = calcularSaldos({ gastos });
    const deudas = calcularDeudas({ gastos });
    for (const [id, s] of saldos) {
      const aFavor = deudas.filter((d) => d.acreedorId === id).reduce((a, d) => a + d.importe, 0);
      const enContra = deudas.filter((d) => d.deudorId === id).reduce((a, d) => a + d.importe, 0);
      expect(aFavor - enContra).toBe(s.saldo);
    }
  });
});
