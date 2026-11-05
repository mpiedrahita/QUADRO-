/**
 * Cálculo de aportes, obligaciones, saldos y deudas (RF-08, RF-17, RF-19).
 *
 * Definiciones:
 *  - pagado:    suma de los gastos que pagó el participante.
 *  - asignado:  suma de las partes que le corresponden en los repartos.
 *  - enviado:   suma de las liquidaciones que pagó a otros integrantes.
 *  - recibido:  suma de las liquidaciones que recibió.
 *  - saldo = pagado − asignado + enviado − recibido
 *      saldo > 0  -> el grupo le debe (a favor)
 *      saldo < 0  -> debe al grupo
 *  La suma de todos los saldos de un grupo siempre es 0.
 *
 * Los gastos ANULADOS y las liquidaciones ANULADAS no se tienen en cuenta.
 */

const gastoVigente = (g) => g.estado !== 'ANULADO';
const liquidacionVigente = (l) => l.estado !== 'ANULADA';

/**
 * @param {object} datos
 * @param {string[]} datos.participacionIds Participaciones que deben aparecer aunque no tengan movimientos
 * @param {{pagadorId: string, estado: string, importe: number, repartos: {participacionId: string, importeAsignado: number}[]}[]} datos.gastos
 * @param {{emisorId: string, receptorId: string, importe: number, estado: string}[]} datos.liquidaciones
 * @returns {Map<string, {pagado: number, asignado: number, enviado: number, recibido: number, saldo: number}>}
 */
export function calcularSaldos({ participacionIds = [], gastos = [], liquidaciones = [] }) {
  const saldos = new Map();
  const cuenta = (id) => {
    if (!saldos.has(id)) saldos.set(id, { pagado: 0, asignado: 0, enviado: 0, recibido: 0, saldo: 0 });
    return saldos.get(id);
  };
  participacionIds.forEach(cuenta);

  for (const gasto of gastos.filter(gastoVigente)) {
    cuenta(gasto.pagadorId).pagado += gasto.importe;
    for (const reparto of gasto.repartos) {
      cuenta(reparto.participacionId).asignado += reparto.importeAsignado;
    }
  }
  for (const liq of liquidaciones.filter(liquidacionVigente)) {
    cuenta(liq.emisorId).enviado += liq.importe;
    cuenta(liq.receptorId).recibido += liq.importe;
  }
  for (const s of saldos.values()) {
    s.saldo = s.pagado - s.asignado + s.enviado - s.recibido;
  }
  return saldos;
}

/**
 * Deudas pendientes entre pares de integrantes.
 * Por cada gasto, cada participante del reparto le debe su parte a quien pagó.
 * Las liquidaciones reducen la deuda del emisor con el receptor.
 * Finalmente se compensan las deudas en ambos sentidos de cada par.
 * @returns {{deudorId: string, acreedorId: string, importe: number}[]}
 */
export function calcularDeudas({ gastos = [], liquidaciones = [] }) {
  const deuda = new Map(); // clave "deudor|acreedor" -> importe
  const sumar = (deudor, acreedor, importe) => {
    if (deudor === acreedor) return;
    const clave = `${deudor}|${acreedor}`;
    deuda.set(clave, (deuda.get(clave) ?? 0) + importe);
  };

  for (const gasto of gastos.filter(gastoVigente)) {
    for (const reparto of gasto.repartos) {
      sumar(reparto.participacionId, gasto.pagadorId, reparto.importeAsignado);
    }
  }
  for (const liq of liquidaciones.filter(liquidacionVigente)) {
    sumar(liq.emisorId, liq.receptorId, -liq.importe);
  }

  const resultado = [];
  const vistos = new Set();
  for (const clave of deuda.keys()) {
    const [a, b] = clave.split('|');
    const par = [a, b].sort().join('|');
    if (vistos.has(par)) continue;
    vistos.add(par);
    const neto = (deuda.get(`${a}|${b}`) ?? 0) - (deuda.get(`${b}|${a}`) ?? 0);
    if (neto > 0) resultado.push({ deudorId: a, acreedorId: b, importe: neto });
    else if (neto < 0) resultado.push({ deudorId: b, acreedorId: a, importe: -neto });
  }
  return resultado.sort((x, y) => y.importe - x.importe);
}

/** Deuda pendiente de un integrante con otro (0 si no le debe). */
export function deudaEntre(deudas, deudorId, acreedorId) {
  return deudas.find((d) => d.deudorId === deudorId && d.acreedorId === acreedorId)?.importe ?? 0;
}
