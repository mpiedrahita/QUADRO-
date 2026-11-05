/**
 * Lógica de distribución de gastos (RF-06, RF-07, RNF-03).
 *
 * Funciones puras: no acceden a la base de datos, por lo que se prueban de forma unitaria.
 *
 * Regla de redondeo (RNF-03):
 *  - Los importes se manejan en pesos enteros.
 *  - Partes iguales: cada participante recibe la división entera y los pesos sobrantes
 *    se asignan, de a uno, a los primeros participantes en el orden recibido.
 *    Ej.: $100.000 entre 3 -> 33.334, 33.333, 33.333 (PU-02).
 *  - Porcentajes: se calcula la parte exacta, se toma la parte entera y los pesos sobrantes
 *    se asignan a quienes tienen la mayor fracción decimal (método del mayor residuo);
 *    en empate, al primero en el orden recibido.
 *  - Valores específicos: deben sumar exactamente el importe del gasto.
 *  En todos los casos la suma de los repartos es igual al importe total.
 */
import { ErrorDominio } from '../utils/errores.js';

export const METODOS = Object.freeze(['IGUAL', 'PORCENTAJE', 'VALOR']);
export const IMPORTE_MAXIMO = 1_000_000_000;

const formatoPesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const pesos = (valor) => formatoPesos.format(valor);

/** Valida que el importe sea un entero positivo dentro del límite permitido. */
export function validarImporte(importe) {
  if (!Number.isInteger(importe) || importe <= 0) {
    throw new ErrorDominio('El importe debe ser un número entero mayor que cero.', 'importe');
  }
  if (importe > IMPORTE_MAXIMO) {
    throw new ErrorDominio(`El importe no puede superar ${pesos(IMPORTE_MAXIMO)}.`, 'importe');
  }
}

/**
 * Calcula la parte que corresponde a cada participante.
 * @param {object} datos
 * @param {number} datos.importe Importe total en pesos enteros
 * @param {'IGUAL'|'PORCENTAJE'|'VALOR'} datos.metodo Método de distribución
 * @param {{participacionId: string, porcentaje?: number, valor?: number}[]} datos.participantes
 * @returns {{participacionId: string, importeAsignado: number, porcentaje: number|null}[]}
 */
export function calcularReparto({ importe, metodo, participantes }) {
  validarImporte(importe);
  if (!METODOS.includes(metodo)) {
    throw new ErrorDominio('El método de distribución no es válido.', 'metodo');
  }
  if (!Array.isArray(participantes) || participantes.length === 0) {
    throw new ErrorDominio('Selecciona al menos un participante para el reparto.', 'repartos');
  }
  const ids = participantes.map((p) => p.participacionId);
  if (new Set(ids).size !== ids.length) {
    throw new ErrorDominio('Un participante no puede aparecer dos veces en el reparto.', 'repartos');
  }

  if (metodo === 'IGUAL') return repartirIgual(importe, participantes);
  if (metodo === 'PORCENTAJE') return repartirPorcentaje(importe, participantes);
  return repartirValores(importe, participantes);
}

function repartirIgual(importe, participantes) {
  const n = participantes.length;
  const base = Math.floor(importe / n);
  const sobrante = importe - base * n;
  return participantes.map((p, i) => ({
    participacionId: p.participacionId,
    importeAsignado: base + (i < sobrante ? 1 : 0),
    porcentaje: null,
  }));
}

function repartirPorcentaje(importe, participantes) {
  // Se trabaja en centésimas de punto porcentual para evitar errores de coma flotante.
  const centesimas = participantes.map((p) => {
    const valor = Number(p.porcentaje);
    if (!Number.isFinite(valor) || valor <= 0 || valor > 100) {
      throw new ErrorDominio('Cada porcentaje debe ser mayor que 0 y menor o igual a 100.', 'repartos');
    }
    const enCentesimas = Math.round(valor * 100);
    if (Math.abs(enCentesimas - valor * 100) > 1e-6) {
      throw new ErrorDominio('Los porcentajes admiten como máximo dos decimales.', 'repartos');
    }
    return enCentesimas;
  });
  const total = centesimas.reduce((a, b) => a + b, 0);
  if (total !== 10000) {
    throw new ErrorDominio(
      `Los porcentajes deben sumar 100 %. Actualmente suman ${(total / 100).toLocaleString('es-CO')} %.`,
      'repartos'
    );
  }

  const partes = centesimas.map((c, i) => {
    const exacto = importe * c; // importe en "pesos × centésimas"
    return { indice: i, entero: Math.floor(exacto / 10000), residuo: exacto % 10000 };
  });
  let sobrante = importe - partes.reduce((a, p) => a + p.entero, 0);
  const orden = [...partes].sort((a, b) => b.residuo - a.residuo || a.indice - b.indice);
  for (const parte of orden) {
    if (sobrante === 0) break;
    parte.entero += 1;
    sobrante -= 1;
  }
  return participantes.map((p, i) => ({
    participacionId: p.participacionId,
    importeAsignado: partes[i].entero,
    porcentaje: centesimas[i] / 100,
  }));
}

function repartirValores(importe, participantes) {
  const valores = participantes.map((p) => {
    const valor = Number(p.valor);
    if (!Number.isInteger(valor) || valor <= 0) {
      throw new ErrorDominio('Cada valor asignado debe ser un número entero mayor que cero.', 'repartos');
    }
    return valor;
  });
  const suma = valores.reduce((a, b) => a + b, 0);
  if (suma !== importe) {
    throw new ErrorDominio(
      `La suma de los valores (${pesos(suma)}) debe ser igual al importe del gasto (${pesos(importe)}).`,
      'repartos'
    );
  }
  return participantes.map((p, i) => ({
    participacionId: p.participacionId,
    importeAsignado: valores[i],
    porcentaje: null,
  }));
}
