/** Utilidades de formato para pesos colombianos y fechas. */
const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const miles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

// Se quita el espacio que Intl pone después de "$" para usar la forma habitual en Colombia: $90.000
export const formatoPesos = (valor) => pesos.format(valor ?? 0).replace(/\s/g, '');
export const formatoMiles = (valor) => miles.format(valor ?? 0);

/** "+$60.000", "−$30.000" o "$0" según el signo. */
export function formatoSaldo(valor) {
  if (!valor) return formatoPesos(0);
  return `${valor > 0 ? '+' : '−'}${formatoPesos(Math.abs(valor))}`;
}

/** Convierte el texto de un campo de dinero ("$ 90.000") en entero (90000) o null. */
export function leerPesos(texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '');
  return digitos === '' ? null : Number(digitos);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "2026-11-04" → "4 nov 2026". Las fechas de gastos no tienen hora, así se evitan desfases de zona horaria. */
export function formatoFecha(iso) {
  if (!iso) return '';
  if (iso.length > 10) {
    // Marca de tiempo completa (p. ej. fecha de registro): se muestra en la hora local.
    const f = new Date(iso);
    return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
  }
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** Fecha de hoy en la zona horaria del navegador, formato AAAA-MM-DD. */
export function hoyLocal() {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora - desfase).toISOString().slice(0, 10);
}

export const METODOS = {
  IGUAL: 'Partes iguales',
  PORCENTAJE: 'Porcentajes',
  VALOR: 'Valores específicos',
};

export const iniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
